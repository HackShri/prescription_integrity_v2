#!/usr/bin/env python3
"""
Startup script for the Medical Transcription Inference Service
This script helps start the FastAPI service with proper configuration
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import torch
        import transformers
        import fastapi
        import uvicorn
        import soundfile
        print("✅ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def check_model_path():
    """Check if the model path exists"""
    model_path = r"C:\Users\SHRINIVAS\Music\ai-training\whisper-small-finetuned\checkpoint-310"
    if os.path.exists(model_path):
        print(f"✅ Model path found: {model_path}")
        return True
    else:
        print(f"❌ Model path not found: {model_path}")
        print("Please update the MODEL_DIR in inference_service.py with the correct path")
        return False

def test_service():
    """Test if the service is running"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Service is running and healthy")
            return True
        else:
            print(f"❌ Service returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Service is not responding: {e}")
        return False

def start_service():
    """Start the FastAPI service"""
    print("🚀 Starting Medical Transcription Service...")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        return False
    
    # Check model path
    if not check_model_path():
        return False
    
    print("\n📡 Starting FastAPI server on http://localhost:8001")
    print("📋 API Documentation available at: http://localhost:8001/docs")
    print("🔍 Health check endpoint: http://localhost:8001/health")
    print("\n⏳ Loading model... This may take a few minutes on first run")
    print("=" * 50)
    
    try:
        # Start the service
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "inference_service:app", 
            "--host", "0.0.0.0", 
            "--port", "8001", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Error starting service: {e}")
        return False
    
    return True

if __name__ == "__main__":
    start_service()
