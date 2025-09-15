import os
import tempfile
import torch
import soundfile as sf
import librosa
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import uvicorn
import logging
from typing import Optional
from pydub import AudioSegment
from smart_prescription import SmartPrescriptionSystem

# ====== MODEL LOADING ======
MODEL_DIR = r"C:\\Users\\SHRINIVAS\\Music\\ai-training\\whisper-small-finetuned\\checkpoint-310"

processor = WhisperProcessor.from_pretrained("openai/whisper-small")
model = WhisperForConditionalGeneration.from_pretrained(MODEL_DIR)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)

# Initialize Smart Prescription System
smart_prescription = SmartPrescriptionSystem()

# ====== LOGGING SETUP ======
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ====== AUDIO PROCESSING FUNCTIONS ======
def convert_and_resample_audio(input_path: str, output_path: str, target_sr: int = 16000):
    """
    Convert audio file to WAV format and resample to target sample rate
    This matches the format used in training (16kHz WAV)
    """
    try:
        # Load audio with pydub (handles many formats including WEBM)
        audio = AudioSegment.from_file(input_path)
        
        # Convert to mono if stereo
        if audio.channels > 1:
            audio = audio.set_channels(1)
        
        # Resample to target sample rate (16kHz for training)
        audio = audio.set_frame_rate(target_sr)
        
        # Export as WAV
        audio.export(output_path, format="wav")
        
        logger.info(f"Audio converted: {input_path} -> {output_path} ({target_sr}Hz)")
        return True
        
    except Exception as e:
        logger.error(f"Audio conversion failed: {e}")
        return False

def load_audio_for_whisper(file_path: str, target_sr: int = 16000):
    """
    Load and preprocess audio for Whisper model
    Returns audio array and sample rate
    """
    try:
        # Load audio with librosa (better for ML models)
        audio, sr = librosa.load(file_path, sr=target_sr, mono=True)
        
        # Ensure audio is not empty
        if len(audio) == 0:
            raise ValueError("Audio file is empty")
        
        # Normalize audio
        audio = audio / np.max(np.abs(audio))
        
        logger.info(f"Audio loaded: {len(audio)} samples, {sr} Hz")
        return audio, sr
        
    except Exception as e:
        logger.error(f"Audio loading failed: {e}")
        raise

# ====== FASTAPI APP ======
app = FastAPI(title="Medical Transcription Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": True, "device": device}

@app.post("/check-drug-interactions")
async def check_drug_interactions(request: dict):
    """
    Check for drug interactions between multiple medications
    """
    try:
        drugs = request.get("drugs", [])
        age = request.get("age", 25)
        weight = request.get("weight", 70.0)
        
        if not drugs or len(drugs) < 2:
            return {
                "interactions": [],
                "message": "Need at least 2 drugs to check interactions"
            }
        
        logger.info(f"Checking drug interactions for: {drugs}")
        
        # Use the smart prescription system to analyze drug interactions
        interactions = smart_prescription.check_drug_interactions(drugs, age, weight)
        
        return {
            "interactions": interactions,
            "total_drugs": len(drugs),
            "interactions_found": len(interactions)
        }
        
    except Exception as e:
        logger.error(f"Drug interaction check failed: {e}")
        return {
            "interactions": [],
            "error": f"Drug interaction check failed: {str(e)}"
        }

@app.post("/smart-transcribe")
async def smart_transcribe(
    audio: UploadFile = File(...),
    age: int = 25,
    weight: float = 70.0
):
    """
    Smart transcription with automatic prescription generation
    Combines voice transcription, NER, and drug recommendations
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    logger.info(f"Smart transcription: {audio.filename}, age: {age}, weight: {weight}")
    
    # First, get the transcription (reuse existing logic)
    transcription_result = await transcribe(audio)
    transcription_text = transcription_result.get("transcription", "")
    
    if not transcription_text or transcription_text == "No speech detected in audio":
        return {
            "transcription": transcription_text,
            "prescription": None,
            "error": "No speech detected"
        }
    
    # Process with smart prescription system
    try:
        prescription = smart_prescription.process_transcription(
            transcription_text, age, weight
        )
        
        # Format for frontend
        formatted_prescription = smart_prescription.format_for_frontend(prescription)
        
        return {
            "transcription": transcription_text,
            "prescription": formatted_prescription,
            "raw_analysis": prescription,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Smart prescription failed: {e}")
        return {
            "transcription": transcription_text,
            "prescription": None,
            "error": f"Prescription generation failed: {str(e)}"
        }

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using fine-tuned Whisper model
    Supports various audio formats: wav, mp3, webm, m4a, flac
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    logger.info(f"Received audio file: {audio.filename}, size: {audio.size} bytes")
    
    # Determine file extension
    suffix = os.path.splitext(audio.filename)[1].lower()
    if not suffix:
        suffix = ".wav"  # Default to wav if no extension
    
    # Save temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Create a converted WAV file path
        converted_path = tmp_path.replace(os.path.splitext(tmp_path)[1], '_converted.wav')
        
        # Convert and resample audio to match training format (16kHz WAV)
        if not convert_and_resample_audio(tmp_path, converted_path, target_sr=16000):
            raise HTTPException(status_code=400, detail="Failed to convert audio format")
        
        # Load the converted audio for Whisper
        try:
            speech, sr = load_audio_for_whisper(converted_path, target_sr=16000)
        except Exception as e:
            logger.error(f"Error loading converted audio: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to load audio: {str(e)}")
        
        # Validate audio data
        if len(speech) == 0:
            raise HTTPException(status_code=400, detail="Audio file appears to be empty")
        
        logger.info(f"Audio processed: {len(speech)} samples, {sr} Hz sample rate")
        
        # Whisper inference (force English transcription)
        inputs = processor(speech, sampling_rate=sr, return_tensors="pt").input_features.to(device)
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="english", task="transcribe")
        
        # Generate transcription with better parameters
        predicted_ids = model.generate(
            inputs, 
            forced_decoder_ids=forced_decoder_ids,
            max_length=448,  # Whisper's max length
            num_beams=1,     # Faster inference
            do_sample=False
        )
        
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        # Clean up transcription
        transcription = transcription.strip()
        if not transcription:
            transcription = "No speech detected in audio"
        
        logger.info(f"Transcription completed: {len(transcription)} characters")
        
        return {
            "transcription": transcription,
            "confidence": "high",  # Could be enhanced with actual confidence scores
            "language": "english",
            "duration": len(speech) / sr if sr > 0 else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temp files
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        try:
            if 'converted_path' in locals():
                os.remove(converted_path)
        except OSError:
            pass


if __name__ == "__main__":
    uvicorn.run("inference_service:app", host="0.0.0.0", port=8001, reload=False)
