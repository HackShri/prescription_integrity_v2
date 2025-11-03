import os
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import uvicorn
import logging
from pydub import AudioSegment
import librosa
import io
from typing import List, Dict, Optional
from PIL import Image
import base64
# Import the new RAG system
from rag_prescription_generator import RAGPrescriptionGenerator
from langchain_ollama import OllamaLLM as Ollama

# ====== LOGGING & MODEL LOADING ======
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Whisper Model
try:
    logger.info("Loading Whisper model...")
    processor = WhisperProcessor.from_pretrained("openai/whisper-medium")
    model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-medium")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    logger.info(f"✅ Whisper model loaded successfully on {device}")
except Exception as e:
    logger.error(f"❌ Failed to load Whisper model: {e}")
    raise

# Initialize the RAG system
rag_generator = None
try:
    rag_generator = RAGPrescriptionGenerator()
    logger.info(f"✅ RAG system initialized successfully with medical_data.json knowledge base")
except Exception as e:
    logger.error(f"❌ CRITICAL: Failed to initialize RAG generator. The service may not function correctly. Error: {e}")
    logger.error("The service will start but prescription generation will fail until RAG is fixed.")
    # Don't raise - allow service to start for health checks, but warn users

# Initialize Ollama for chatbot (direct connection, separate from RAG)
ollama_chat_llm = None
ollama_model_name = os.getenv("OLLAMA_MODEL", "meditron:7b")
try:
    ollama_chat_llm = Ollama(model=ollama_model_name, temperature=0.7)
    logger.info(f"✅ Ollama chatbot initialized with model: {ollama_model_name}")
except Exception as e:
    logger.error(f"❌ Failed to initialize Ollama chatbot. Error: {e}")
    logger.error("Make sure Ollama is running (ollama serve) and the model is available.")

# Initialize DeepSeek-OCR model
ocr_processor = None
ocr_model = None
try:
    logger.info("Loading DeepSeek-OCR model from Hugging Face...")
    from transformers import AutoProcessor, AutoModel
    
    ocr_model_name = "deepseek-ai/DeepSeek-OCR"
    
    # Load processor and model
    ocr_processor = AutoProcessor.from_pretrained(ocr_model_name)
    ocr_model = AutoModel.from_pretrained(
        ocr_model_name,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        trust_remote_code=True  # DeepSeek models may require this
    )
    
    # Move to appropriate device
    if torch.cuda.is_available():
        ocr_model = ocr_model.cuda()
        logger.info("✅ DeepSeek-OCR model loaded successfully on CUDA")
    else:
        ocr_model = ocr_model.cpu()
        logger.info("✅ DeepSeek-OCR model loaded successfully on CPU")
    
    ocr_model.eval()
    
except Exception as e:
    logger.error(f"❌ Failed to load DeepSeek-OCR model: {e}")
    logger.error("OCR functionality will not be available. Please check internet connection and Hugging Face access.")
    logger.error(f"Error details: {type(e).__name__}: {str(e)}")
    ocr_processor = None
    ocr_model = None

# ====== FASTAPI APP ======
app = FastAPI(title="Medical AI Service", version="3.0.0 RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====== API ENDPOINTS ======
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "whisper_model": "medium", 
        "rag_status": "active" if rag_generator else "failed",
        "llm_model": rag_generator.model_name if rag_generator else "not initialized",
        "chatbot_model": ollama_model_name,
        "chatbot_status": "active" if ollama_chat_llm else "failed",
        "ocr_model": "deepseek-ai/DeepSeek-OCR",
        "ocr_status": "active" if ocr_model else "failed",
        "device": device,
        "knowledge_base": "loaded" if rag_generator else "not loaded"
    }


@app.post("/ask")
async def ask_medical_question(payload: dict):
    """
    Chatbot endpoint that uses Ollama meditron for conversational responses.
    Accepts JSON: {"question": "..."} or {"messages": [{"role": "user", "content": "..."}]}
    Returns a conversational response with optional RAG context when relevant.
    """
    try:
        # Check if Ollama is available
        if not ollama_chat_llm:
            raise HTTPException(
                status_code=503, 
                detail="Ollama chatbot is not initialized. Please ensure Ollama is running and the meditron model is available."
            )
        
        # Support both old format {"question": "..."} and new format {"messages": [...]}
        question = None
        messages = payload.get("messages") if isinstance(payload, dict) else None
        
        if messages and isinstance(messages, list) and len(messages) > 0:
            # Get the last user message from conversation history
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    question = msg.get("content")
                    break
        else:
            question = payload.get("question") if isinstance(payload, dict) else None
        
        if not question:
            raise HTTPException(status_code=400, detail="No question provided. Send {'question': '...'} or {'messages': [...]}")
        
        logger.info(f"Chatbot question: '{question[:100]}...'")
        
        # Try to get relevant context from RAG if available and question seems medical
        medical_keywords = ['symptom', 'condition', 'disease', 'medication', 'drug', 'treatment', 'diagnosis', 
                           'pain', 'fever', 'cough', 'infection', 'allergy', 'prescription']
        has_medical_context = False
        rag_context = ""
        
        if rag_generator and any(keyword in question.lower() for keyword in medical_keywords):
            try:
                # Get quick context from RAG without full prescription generation
                result = rag_generator.generate(question)
                if isinstance(result, dict) and "error" not in result:
                    condition = result.get("condition", "")
                    advice = result.get("general_advice", "")
                    if condition and advice:
                        rag_context = f"\n\nRelevant medical context: {condition}. General advice: {advice}\n(Note: This is general information. Always consult a healthcare professional.)"
                        has_medical_context = True
                        logger.info(f"Added RAG context for condition: {condition}")
            except Exception as rag_err:
                logger.warning(f"RAG context retrieval failed (non-critical): {rag_err}")
        
        # Build a cleaner, more direct prompt for Ollama
        # Format: Direct question with optional context, concise and to the point
        if rag_context:
            user_prompt = f"{question}{rag_context}\n\nPlease provide a helpful medical response:"
        else:
            user_prompt = f"{question}\n\nPlease provide a helpful medical response:"
        
        try:
            # Generate response using Ollama
            response = ollama_chat_llm.invoke(user_prompt)
            
            if response:
                content = str(response).strip()
                
                # Clean up the response - remove any prompt text that might have been included
                # Remove the prompt template if it appears in the response
                # Clean up response - remove prompt template if LLM echoes it back
                prompt_markers = [
                    "You are an artificial intelligence assistant",
                    "You are a helpful medical assistant",
                    "You provide detailed and polite responses",
                    "Guidelines:",
                    "Provide a helpful, accurate response:",
                    "Provide an accurate and concise response:",
                    "Answer this medical question helpfully and concisely:",
                    "Please provide a helpful medical response:",
                    "User asks:",
                    "User Question:",
                    "adhere to the guidelines",
                    "If asked about a specific condition"
                ]
                
                # Check if response contains prompt template and extract actual answer
                content_lower = content.lower()
                
                # Look for key markers that indicate where the actual answer starts
                # Priority: Look for the question or response prompt markers
                answer_markers = [
                    "provide an accurate and concise response:",
                    "user question:",
                    "please provide a helpful medical response:"
                ]
                
                answer_start = -1
                for marker in answer_markers:
                    marker_pos = content_lower.find(marker)
                    if marker_pos >= 0:
                        answer_start = marker_pos + len(marker)
                        # Skip separators
                        while answer_start < len(content) and content[answer_start] in [':', '-', ' ', '\n']:
                            answer_start += 1
                        break
                
                # If we found where the answer starts, extract it
                if answer_start > 0:
                    content = content[answer_start:].strip()
                else:
                    # Fallback: Remove prompt markers from the beginning
                    for marker in prompt_markers:
                        if content_lower.startswith(marker.lower()):
                            content = content[len(marker):].strip()
                            # Remove leading separators
                            while content and content[0] in [':', '-', ' ', '\n']:
                                content = content[1:].strip()
                            break
                
                # Final cleanup - ensure we have actual content
                if not content or len(content) < 10:
                    content = "I understand your concern. Please provide more details about your symptoms, and I'll do my best to help. For serious symptoms, please consult a healthcare professional immediately."
                
                logger.info(f"✅ Generated chatbot response ({len(content)} chars)")
                return {"content": content}
            else:
                raise ValueError("Empty response from Ollama")
                
        except Exception as llm_err:
            logger.error(f"Error calling Ollama: {llm_err}")
            # Fallback response
            return {
                "content": "I'm having trouble processing your question right now. Please try again or consult a healthcare professional directly."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ask_medical_question: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.post("/ocr-extract")
async def ocr_extract_text(
    image: UploadFile = File(...)
):
    """
    OCR endpoint using DeepSeek-OCR from Hugging Face.
    Accepts an image file and returns extracted text.
    """
    try:
        if not ocr_model or not ocr_processor:
            raise HTTPException(
                status_code=503,
                detail="DeepSeek-OCR model is not initialized. Please check server logs."
            )
        
        logger.info(f"Received OCR request for file: {image.filename}")
        
        # Read image file
        image_bytes = await image.read()
        image_io = io.BytesIO(image_bytes)
        
        # Load and preprocess image
        try:
            pil_image = Image.open(image_io).convert("RGB")
        except Exception as img_err:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(img_err)}")
        
        # Process image with DeepSeek-OCR
        try:
            logger.info("Processing image with DeepSeek-OCR...")
            
            # Prepare inputs for the model - DeepSeek-OCR may use different input format
            # Try standard vision-to-text approach first
            try:
                inputs = ocr_processor(images=pil_image, return_tensors="pt")
                
                # Move inputs to the same device as the model
                model_device = next(ocr_model.parameters()).device
                inputs = {k: v.to(model_device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}
                
                # Check if model has generate method (for text generation models)
                if hasattr(ocr_model, 'generate'):
                    # Generate OCR text
                    with torch.no_grad():
                        generated_ids = ocr_model.generate(
                            **inputs,
                            max_new_tokens=2048,
                            num_beams=3,
                            do_sample=False,
                        )
                    
                    # Decode the generated text
                    generated_text = ocr_processor.batch_decode(
                        generated_ids,
                        skip_special_tokens=True,
                        clean_up_tokenization_spaces=True
                    )[0]
                    extracted_text = generated_text.strip()
                else:
                    # Model might return text directly or use forward pass
                    with torch.no_grad():
                        outputs = ocr_model(**inputs)
                    # Extract text from outputs - adjust based on actual model output
                    if hasattr(outputs, 'text'):
                        extracted_text = outputs.text.strip()
                    elif hasattr(outputs, 'predicted_ids'):
                        generated_text = ocr_processor.batch_decode(
                            outputs.predicted_ids,
                            skip_special_tokens=True,
                            clean_up_tokenization_spaces=True
                        )[0]
                        extracted_text = generated_text.strip()
                    else:
                        # Fallback: try to decode logits if available
                        raise NotImplementedError("Model output format not recognized")
                        
            except Exception as model_err:
                logger.warning(f"Standard approach failed, trying alternative: {model_err}")
                # Alternative: Some OCR models might work differently
                # Try calling the model directly with image
                if hasattr(ocr_model, '__call__'):
                    with torch.no_grad():
                        result = ocr_model(pil_image)
                        if isinstance(result, str):
                            extracted_text = result.strip()
                        elif isinstance(result, dict) and 'text' in result:
                            extracted_text = result['text'].strip()
                        else:
                            raise ValueError(f"Unexpected model output: {type(result)}")
                else:
                    raise model_err
            
            if not extracted_text:
                raise HTTPException(status_code=400, detail="No text detected in the image.")
            
            logger.info(f"✅ OCR extraction successful. Extracted {len(extracted_text)} characters.")
            
            return {
                "text": extracted_text,
                "confidence": "high",  # DeepSeek-OCR doesn't provide confidence scores directly
                "model": "deepseek-ai/DeepSeek-OCR"
            }
            
        except Exception as ocr_err:
            logger.error(f"OCR processing error: {ocr_err}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(ocr_err)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ocr_extract_text: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred during OCR extraction: {str(e)}")

@app.post("/generate-prescription")
async def generate_prescription(
    audio: UploadFile = File(...),
    age: int = Form(30),
    weight: float = Form(70.0)
):
    logger.info(f"Received request for file: {audio.filename}")
    
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    try:
        # Step 1: Read audio file into an in-memory buffer
        content = await audio.read()
        audio_file_like = io.BytesIO(content)
        
        # Step 2: Convert audio in-memory using pydub
        logger.info("Converting audio in-memory...")
        audio_segment = AudioSegment.from_file(audio_file_like)
        audio_segment = audio_segment.set_channels(1).set_frame_rate(16000)
        
        # Export to an in-memory WAV file for librosa
        wav_io = io.BytesIO()
        audio_segment.export(wav_io, format="wav")
        wav_io.seek(0) # Reset buffer position to the beginning

        # Step 3: Load audio data from the in-memory WAV buffer using librosa
        speech, sr = librosa.load(wav_io, sr=16000, mono=True)
        if len(speech) == 0:
            raise ValueError("Audio processing resulted in an empty file.")
        
        logger.info(f"✅ Audio processed in-memory: duration={len(speech)/sr:.2f}s")
        
        # Step 4: Transcribe audio with Whisper
        logger.info("Transcribing audio...")
        inputs = processor(speech, sampling_rate=sr, return_tensors="pt").input_features.to(device)
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="english", task="transcribe")
        
        with torch.no_grad():
            predicted_ids = model.generate(inputs, forced_decoder_ids=forced_decoder_ids)
        
        transcription_text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

        if not transcription_text:
            raise HTTPException(status_code=400, detail="No speech detected in audio.")

        logger.info(f"✅ Transcription successful: '{transcription_text}'")

        # Step 5: Generate prescription details with the RAG System
        if not rag_generator:
            raise HTTPException(status_code=503, detail="RAG system is not initialized. Please check server logs.")
        
        rag_result = rag_generator.generate(transcription_text)

        if "error" in rag_result:
            raise HTTPException(status_code=500, detail=rag_result["error"])

        # Step 6: Construct the final frontend-ready object
        medications = rag_result.get("medications", [])
        
        formatted_medications = []
        for med in medications:
            # Ensure quantity is handled correctly (can be int or string)
            quantity = med.get("quantity")
            if quantity is None:
                quantity = 10  # Default fallback
            elif isinstance(quantity, str):
                # If quantity is a string like "10 units", try to extract the number
                try:
                    quantity = int(''.join(filter(str.isdigit, str(quantity))) or 10)
                except (ValueError, TypeError):
                    quantity = 10
            elif not isinstance(quantity, int):
                quantity = int(quantity) if quantity else 10
            
            formatted_med = {
                "name": med.get("name", "Unknown"),
                "dosage": med.get("dosage", "As directed"),
                "quantity": quantity,
                "frequency": med.get("frequency", "twice daily"),
                "timing": med.get("timing", "after meals"),
                "duration": med.get("duration", "5 days"),
                "instructions": med.get("instructions", "Take as directed")
            }
            formatted_medications.append(formatted_med)

        final_prescription = {
            "age": age,
            "weight": weight,
            "instructions": rag_result.get("general_advice", "Please follow medication instructions carefully."),
            "medications": formatted_medications,
            "condition": rag_result.get("condition", "")
        }

        return {
            "transcription": transcription_text,
            "prescriptionData": final_prescription
        }

    except Exception as e:
        logger.error(f"❌ An error occurred in the generation pipeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")
    # The 'finally' block for file cleanup is no longer needed

if __name__ == "__main__":
    uvicorn.run("inference_service:app", host="0.0.0.0", port=8001, reload=True)