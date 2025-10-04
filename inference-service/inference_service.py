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
# Import the new RAG system
from rag_prescription_generator import RAGPrescriptionGenerator

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
try:
    rag_generator = RAGPrescriptionGenerator()
except Exception as e:
    logger.error(f"❌ CRITICAL: Failed to initialize RAG generator. The service may not function correctly. Error: {e}")
    # We can decide to raise an error here to stop the service from starting
    # raise e

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
        "rag_status": "active",
        "llm_model": rag_generator.model_name,
        "device": device
    }


@app.post("/ask")
async def ask_medical_question(payload: dict):
    """Accepts JSON: {"question": "..."} and returns a short answer."""
    try:
        question = payload.get("question") if isinstance(payload, dict) else None
        if not question:
            raise ValueError("No question provided")

        # Try to generate a prescription-style response to extract context, otherwise fallback
        result = rag_generator.generate(question)

        # If the RAG pipeline returned medications or advice, produce a concise summary
        if isinstance(result, dict):
            advice = result.get("general_advice")
            medications = result.get("medications", [])
            if medications:
                meds_list = ", ".join([m.get("name", "unknown") for m in medications[:5]])
                content = f"Based on the context: {advice or ''} Suggested medications: {meds_list}."
            else:
                content = advice or "I couldn't find specific treatment suggestions; please consult a clinician."

            return {"content": content}

        return {"content": "I couldn't process the question. Please try again with more details."}
    except Exception as e:
        return {"content": f"Error processing question: {e}"}

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
        rag_result = rag_generator.generate(transcription_text)

        if "error" in rag_result:
            raise HTTPException(status_code=500, detail=rag_result["error"])

        # Step 6: Construct the final frontend-ready object
        medications = rag_result.get("medications", [])
        
        formatted_medications = []
        for med in medications:
            formatted_med = {
                "name": med.get("name", "Unknown"),
                "dosage": med.get("dosage", "As directed"),
                "quantity": med.get("quantity", "10 units"),
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