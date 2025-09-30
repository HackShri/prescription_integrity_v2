import os
import tempfile
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import uvicorn
import logging
from pydub import AudioSegment
import librosa
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

# ====== AUDIO HELPERS ======
def convert_and_resample_audio(input_path: str, output_path: str, target_sr: int = 16000):
    """Converts any audio format supported by ffmpeg to a mono 16kHz WAV file."""
    try:
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_channels(1).set_frame_rate(target_sr)
        audio.export(output_path, format="wav")
        logger.info(f"✅ Audio converted successfully to {output_path}")
        return True
    except Exception as e:
        logger.error(f"❌ Audio conversion failed: {e}")
        return False

def load_audio_for_whisper(file_path: str, target_sr: int = 16000):
    """Loads the converted WAV file for Whisper processing."""
    try:
        audio, sr = librosa.load(file_path, sr=target_sr, mono=True)
        if len(audio) == 0:
            raise ValueError("Audio file is empty after conversion.")
        logger.info(f"✅ Audio loaded for Whisper: duration={len(audio)/sr:.2f}s")
        return audio, sr
    except Exception as e:
        logger.error(f"❌ Audio loading failed: {e}")
        raise

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

@app.post("/generate-prescription")
async def generate_prescription(
    audio: UploadFile = File(...),
    age: int = Form(30),
    weight: float = Form(70.0)
):
    logger.info(f"Received request for file: {audio.filename}")
    
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    suffix = os.path.splitext(audio.filename)[1].lower() or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    transcription_text = ""
    converted_path = None
    
    try:
        # Step 1 & 2: Convert and load audio
        converted_path = tmp_path.replace(suffix, '_converted.wav')
        if not convert_and_resample_audio(tmp_path, converted_path):
            raise HTTPException(status_code=400, detail="Failed to convert audio format.")
        
        speech, sr = load_audio_for_whisper(converted_path)
        
        # Step 3: Transcribe audio with Whisper
        logger.info("Transcribing audio...")
        inputs = processor(speech, sampling_rate=sr, return_tensors="pt").input_features.to(device)
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="english", task="transcribe")
        
        with torch.no_grad():
            predicted_ids = model.generate(inputs, forced_decoder_ids=forced_decoder_ids)
        
        transcription_text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

        if not transcription_text:
            raise HTTPException(status_code=400, detail="No speech detected in audio.")

        logger.info(f"✅ Transcription successful: '{transcription_text}'")

        # Step 4: Generate prescription details with the RAG System
        rag_result = rag_generator.generate(transcription_text)

        if "error" in rag_result:
            raise HTTPException(status_code=500, detail=rag_result["error"])

        # Step 5: Construct the final frontend-ready object
        # Properly structure the medications array
        medications = rag_result.get("medications", [])
        
        # Ensure all medications have required fields
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
        logger.error(f"❌ An error occurred in the generation pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")
    finally:
        # Ensure temporary files are always cleaned up
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        if converted_path and os.path.exists(converted_path):
            os.remove(converted_path)

if __name__ == "__main__":
    uvicorn.run("inference_service:app", host="0.0.0.0", port=8001, reload=True)