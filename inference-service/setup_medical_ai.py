#!/usr/bin/env python3
"""
Setup script for Medical AI System
Installs all required dependencies and models
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    """Main setup function"""
    print("🏥 Setting up Medical AI System")
    print("=" * 50)
    
    # Install Python packages
    packages = [
        "spacy",
        "requests",
        "pydub",
        "ffmpeg-python",
        "librosa",
        "numpy",
        "fastapi",
        "uvicorn[standard]",
        "transformers",
        "torch",
        "soundfile"
    ]
    
    print("\n📦 Installing Python packages...")
    for package in packages:
        if not run_command(f"pip install {package}", f"Installing {package}"):
            print(f"⚠️ Failed to install {package}, continuing...")
    
    # Download spaCy model
    print("\n🧠 Downloading spaCy medical model...")
    if not run_command("python -m spacy download en_ner_bc5cdr_md", "Downloading BC5CDR model"):
        print("⚠️ Failed to download BC5CDR model. You may need to install it manually:")
        print("   python -m spacy download en_ner_bc5cdr_md")
    
    # Check Ollama installation
    print("\n🤖 Checking Ollama installation...")
    if not run_command("ollama --version", "Checking Ollama"):
        print("⚠️ Ollama not found. Please install Ollama from: https://ollama.ai/")
        print("   Then run: ollama pull gpt-oss:20b")
    else:
        # Pull gpt-oss:20b model
        print("\n🤖 Pulling gpt-oss:20b model...")
        if not run_command("ollama pull gpt-oss:20b", "Pulling gpt-oss:20b"):
            print("⚠️ Failed to pull gpt-oss:20b. You may need to run: ollama pull gpt-oss:20b")
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed!")
    print("\n📋 Next steps:")
    print("1. Start Ollama: ollama serve")
    print("2. Start the inference service: python inference_service.py")
    print("3. Test the system: python test_audio_conversion.py")

if __name__ == "__main__":
    main()
