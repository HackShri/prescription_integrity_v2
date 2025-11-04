"""
Updated Inference Service with Gemini Vision OCR
Integrates optimized Whisper + Fast RAG + Gemini Vision
"""

import os
import io
import json
import logging
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from dotenv import load_dotenv

import torch
import uvicorn
import librosa
from pydub import AudioSegment
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

# Audio processing
from transformers import WhisperProcessor, WhisperForConditionalGeneration

# Vector store
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Gemini for OCR
import google.generativeai as genai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
load_dotenv()
# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    # Model selections
    WHISPER_MODEL = "openai/whisper-small"
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"
    GEMINI_MODEL = "gemini-2.5-flash"  # Fast and cheap for OCR
    
    # Device
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    
    # API Keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Paths
    KNOWLEDGE_BASE_PATH = "medical_data.json"
    EMBEDDING_CACHE_PATH = "embeddings_cache.npy"
    
    # Performance
    MAX_AUDIO_LENGTH = 30
    
    # CORS
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5000"
    ]

config = Config()

# ============================================================================
# GEMINI OCR SYSTEM
# ============================================================================

PRESCRIPTION_OCR_PROMPT = """You are a medical prescription OCR expert. Extract ALL text from this prescription image.

**EXTRACT EVERYTHING YOU SEE:**

PATIENT INFO:
- Name, Email, Phone, Age, Weight, Height, Gender, Address

DOCTOR INFO:
- Name, Specialization, License Number, Email, Phone
- Clinic/Hospital Name and Address

PRESCRIPTION:
- Date, Prescription ID, Expiry Date

MEDICATIONS (for each medicine):
- Name: [exact drug name]
- Dosage: [e.g., 500mg, 10ml]
- Quantity: [e.g., 30 tablets, 1 bottle]
- Frequency: [e.g., twice daily, BD, OD, TDS]
- Timing: [e.g., after meals, before food]
- Duration: [e.g., 7 days, 2 weeks]
- Instructions: [any special notes]

GENERAL INSTRUCTIONS:
- Any advice, warnings, dietary restrictions, follow-up details

DIAGNOSIS: [if mentioned]

**RULES:**
1. Extract EVERYTHING - don't skip any text
2. Use "Not found" for missing info
3. Be precise with medical terms and dosages
4. Preserve exact abbreviations (BD, OD, TDS, etc.)
5. Note unclear text as: "(unclear: best_guess)"

Extract ALL information now:"""

class GeminiOCR:
    """Fast prescription OCR using Gemini Vision"""
    
    def __init__(self):
        if not config.GEMINI_API_KEY:
            logger.warning("⚠️ GEMINI_API_KEY not set. OCR will not work.")
            self.model = None
            return
        
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name=config.GEMINI_MODEL,
            generation_config={
                "temperature": 0.1,
                "top_p": 0.95,
                "max_output_tokens": 2048,
            },
            safety_settings=[
                {"category": cat, "threshold": "BLOCK_NONE"}
                for cat in [
                    "HARM_CATEGORY_HARASSMENT",
                    "HARM_CATEGORY_HATE_SPEECH",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "HARM_CATEGORY_DANGEROUS_CONTENT"
                ]
            ]
        )
        logger.info("✅ Gemini OCR initialized")
    
    def extract_text(self, image_bytes: bytes) -> str:
        """Extract text from prescription image"""
        if not self.model:
            raise HTTPException(503, "Gemini OCR not configured. Set GEMINI_API_KEY.")
        
        try:
            # Preprocess image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB
            if image.mode not in ('RGB', 'L'):
                image = image.convert('RGB')
            
            # Resize if too large (max 4096px)
            max_dim = 4096
            if max(image.size) > max_dim:
                ratio = max_dim / max(image.size)
                new_size = tuple(int(d * ratio) for d in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Convert to bytes
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='PNG')
            img_bytes = img_bytes.getvalue()
            
            # Call Gemini
            logger.info("Calling Gemini Vision API...")
            response = self.model.generate_content([
                PRESCRIPTION_OCR_PROMPT,
                {"mime_type": "image/png", "data": img_bytes}
            ])
            
            if not response or not response.text:
                raise ValueError("Empty response from Gemini")
            
            text = response.text.strip()
            logger.info(f"✅ Extracted {len(text)} characters")
            return text
            
        except Exception as e:
            logger.error(f"Gemini OCR failed: {e}")
            raise HTTPException(500, f"OCR failed: {str(e)}")

# ============================================================================
# FAST RAG SYSTEM
# ============================================================================

class FastRAGSystem:
    """Lightweight RAG for medication lookup"""
    
    def __init__(self, knowledge_base_path: str):
        logger.info("Initializing Fast RAG System...")
        
        with open(knowledge_base_path, 'r') as f:
            self.knowledge_base: List[Dict] = json.load(f)
        
        self.embedder = SentenceTransformer(config.EMBEDDING_MODEL)
        
        if os.path.exists(config.EMBEDDING_CACHE_PATH):
            self.embeddings = np.load(config.EMBEDDING_CACHE_PATH)
            logger.info("Loaded cached embeddings")
        else:
            self._create_embeddings()
        
        self.symptom_index = self._build_symptom_index()
        logger.info(f"✅ RAG initialized with {len(self.knowledge_base)} conditions")
    
    def _create_embeddings(self):
        """Create and cache embeddings"""
        logger.info("Creating embeddings...")
        texts = []
        for item in self.knowledge_base:
            text_parts = [
                item['condition_name'],
                ', '.join(item.get('symptoms', [])),
                ', '.join([d['name'] for d in item.get('suggested_drugs', [])])
            ]
            texts.append(' '.join(text_parts))
        
        self.embeddings = self.embedder.encode(texts, show_progress_bar=True)
        np.save(config.EMBEDDING_CACHE_PATH, self.embeddings)
        logger.info("✅ Embeddings cached")
    
    def _build_symptom_index(self) -> Dict[str, List[int]]:
        """Build symptom lookup index"""
        index = {}
        for idx, item in enumerate(self.knowledge_base):
            for symptom in item.get('symptoms', []):
                symptom_lower = symptom.lower().strip()
                if symptom_lower not in index:
                    index[symptom_lower] = []
                index[symptom_lower].append(idx)
        return index
    
    def find_condition(self, transcription: str) -> Optional[Dict]:
        """Find matching condition"""
        transcription_lower = transcription.lower()
        
        # Fast path: direct symptom matching
        matched_indices = set()
        for symptom, indices in self.symptom_index.items():
            if symptom in transcription_lower:
                matched_indices.update(indices)
        
        if matched_indices:
            return self.knowledge_base[list(matched_indices)[0]]
        
        # Semantic search
        query_embedding = self.embedder.encode([transcription])
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        best_idx = np.argmax(similarities)
        
        if similarities[best_idx] > 0.3:
            return self.knowledge_base[best_idx]
        
        return None
    
    def generate_prescription(self, transcription: str) -> Dict:
        """Generate prescription from transcription"""
        condition_data = self.find_condition(transcription)
        
        if not condition_data:
            return {
                "error": "Could not identify condition",
                "transcription": transcription,
                "medications": [],
                "general_advice": "Consult a healthcare professional."
            }
        
        medications = []
        for drug in condition_data.get('suggested_drugs', []):
            med = self._format_medication(drug['name'], transcription)
            medications.append(med)
        
        return {
            "condition": condition_data['condition_name'],
            "symptoms_matched": condition_data.get('symptoms', []),
            "medications": medications,
            "general_advice": condition_data.get('general_advice', ''),
            "transcription": transcription
        }
    
    def _format_medication(self, drug_name: str, context: str) -> Dict:
        """Format medication with defaults"""
        defaults = {
            "Acetaminophen": ("500mg", "every 6 hours", "as needed", "3 days", 12),
            "Ibuprofen": ("400mg", "twice daily", "with food", "5 days", 10),
            "Cetirizine": ("10mg", "once daily", "evening", "7 days", 7),
            "Loratadine": ("10mg", "once daily", "morning", "7 days", 7),
            "Antacid": ("10ml", "thrice daily", "after meals", "5 days", 1),
            "Ondansetron": ("4mg", "twice daily", "as needed", "3 days", 6),
            "Loperamide": ("2mg", "after loose stool", "as needed", "2 days", 8),
            "Naproxen": ("250mg", "twice daily", "with food", "5 days", 10),
            "Hydrocortisone Cream": ("1%", "twice daily", "topical", "7 days", 1),
            "Dextromethorphan Syrup": ("10ml", "every 6 hours", "as needed", "5 days", 1),
        }
        
        dosage, frequency, timing, duration, quantity = defaults.get(
            drug_name,
            ("As directed", "As directed", "As directed", "As directed", 1)
        )
        
        return {
            "name": drug_name,
            "dosage": dosage,
            "frequency": frequency,
            "timing": timing,
            "duration": duration,
            "quantity": quantity,
            "instructions": f"Take {drug_name} {frequency} {timing}"
        }

# ============================================================================
# OPTIMIZED WHISPER
# ============================================================================

class OptimizedWhisperProcessor:
    """GPU-optimized Whisper"""
    
    def __init__(self):
        logger.info(f"Loading Whisper on {config.DEVICE}...")
        
        self.processor = WhisperProcessor.from_pretrained(config.WHISPER_MODEL)
        self.model = WhisperForConditionalGeneration.from_pretrained(
            config.WHISPER_MODEL
        ).to(config.DEVICE)
        
        if config.DEVICE == "cuda":
            self.model = self.model.half()
            logger.info("✅ Enabled FP16")
        
        self.model.eval()
        logger.info(f"✅ Whisper loaded")
    
    @torch.no_grad()
    def transcribe(self, audio_bytes: bytes) -> str:
        """Transcribe audio"""
        audio_io = io.BytesIO(audio_bytes)
        audio_segment = AudioSegment.from_file(audio_io)
        audio_segment = audio_segment.set_channels(1).set_frame_rate(16000)
        
        max_ms = config.MAX_AUDIO_LENGTH * 1000
        if len(audio_segment) > max_ms:
            audio_segment = audio_segment[:max_ms]
        
        wav_io = io.BytesIO()
        audio_segment.export(wav_io, format="wav")
        wav_io.seek(0)
        
        speech, sr = librosa.load(wav_io, sr=16000, mono=True)
        
        if len(speech) == 0:
            raise ValueError("Empty audio")
        
        inputs = self.processor(
            speech,
            sampling_rate=sr,
            return_tensors="pt"
        ).input_features.to(config.DEVICE)
        
        forced_decoder_ids = self.processor.get_decoder_prompt_ids(
            language="english",
            task="transcribe"
        )
        
        predicted_ids = self.model.generate(
            inputs,
            forced_decoder_ids=forced_decoder_ids,
            max_length=225,
            num_beams=5
        )
        
        transcription = self.processor.batch_decode(
            predicted_ids,
            skip_special_tokens=True
        )[0].strip()
        
        logger.info(f"Transcribed: '{transcription[:50]}...'")
        return transcription

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="Medical AI Service with Gemini OCR",
    version="5.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class AskPayload(BaseModel):
    question: str

class OCRResponse(BaseModel):
    text: str
    model: str
    confidence: str
    characters_extracted: int

# Global instances
whisper: Optional[OptimizedWhisperProcessor] = None
rag: Optional[FastRAGSystem] = None
gemini_ocr: Optional[GeminiOCR] = None

@app.on_event("startup")
def startup_event():
    """Initialize all services"""
    global whisper, rag, gemini_ocr
    
    logger.info("=" * 60)
    logger.info("Starting Medical AI Service")
    logger.info(f"Device: {config.DEVICE}")
    logger.info(f"Gemini API: {'✅ Configured' if config.GEMINI_API_KEY else '❌ Not set'}")
    logger.info("=" * 60)
    
    try:
        whisper = OptimizedWhisperProcessor()
        rag = FastRAGSystem(config.KNOWLEDGE_BASE_PATH)
        gemini_ocr = GeminiOCR()
        logger.info("✅ All services ready!")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}", exc_info=True)
        raise

@app.get("/health")
def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "device": config.DEVICE,
        "gemini_ocr": "available" if gemini_ocr and gemini_ocr.model else "not configured",
        "whisper_model": config.WHISPER_MODEL,
        "conditions_loaded": len(rag.knowledge_base) if rag else 0
    }

@app.post("/ocr-extract")
async def ocr_extract_text(image: UploadFile = File(...)) -> OCRResponse:
    """
    Extract text from prescription image using Gemini Vision
    
    Cost: ~$0.001 per image (Gemini Flash)
    Speed: 2-4 seconds
    Accuracy: 95%+ for printed text
    """
    
    if not gemini_ocr or not gemini_ocr.model:
        raise HTTPException(
            503,
            "Gemini OCR not configured. Set GEMINI_API_KEY environment variable."
        )
    
    try:
        # Validate file
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(400, "File must be an image")
        
        image_bytes = await image.read()
        
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(400, "Image too large (max 20MB)")
        
        if len(image_bytes) == 0:
            raise HTTPException(400, "Empty image")
        
        logger.info(f"Processing image: {image.filename}")
        
        # Extract text
        extracted_text = gemini_ocr.extract_text(image_bytes)
        
        if len(extracted_text.strip()) < 10:
            raise HTTPException(400, "No text detected in image")
        
        return OCRResponse(
            text=extracted_text,
            model="gemini-2.5-flash",
            confidence="high",
            characters_extracted=len(extracted_text)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR failed: {e}", exc_info=True)
        raise HTTPException(500, f"OCR failed: {str(e)}")

@app.post("/generate-prescription")
async def generate_prescription(
    audio: UploadFile = File(...),
    age: int = Form(30),
    weight: float = Form(70.0)
):
    """Audio → Transcription → Prescription"""
    
    try:
        audio_bytes = await audio.read()
        logger.info(f"Processing audio: {audio.filename}")
        
        transcription = whisper.transcribe(audio_bytes)
        
        if not transcription:
            raise HTTPException(400, "No speech detected")
        
        prescription_data = rag.generate_prescription(transcription)
        
        result = {
            "transcription": transcription,
            "prescriptionData": {
                "age": age,
                "weight": weight,
                "condition": prescription_data.get("condition", "Unknown"),
                "instructions": prescription_data.get("general_advice", ""),
                "medications": prescription_data.get("medications", []),
                "expiresAt": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        }
        
        logger.info(f"✅ Generated prescription with {len(result['prescriptionData']['medications'])} meds")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(500, str(e))

@app.post("/ask")
async def ask_question(payload: AskPayload):
    """Simple Q&A using RAG"""
    
    try:
        result = rag.generate_prescription(payload.question)
        
        if "error" in result:
            content = result["general_advice"]
        else:
            condition = result.get("condition", "your condition")
            advice = result.get("general_advice", "")
            content = f"Based on your symptoms, this appears to be {condition}. {advice}"
        
        return {"content": content}
        
    except Exception as e:
        logger.error(f"Error in /ask: {e}", exc_info=True)
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    uvicorn.run(
        "inference_service:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )