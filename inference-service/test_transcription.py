#!/usr/bin/env python3
"""
Test script for the Medical Transcription Service
This script tests the transcription endpoint with a sample audio file
"""

import requests
import os
import time
from pathlib import Path

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed")
            print(f"   Status: {data.get('status')}")
            print(f"   Model loaded: {data.get('model_loaded')}")
            print(f"   Device: {data.get('device')}")
            return True
        else:
            print(f"❌ Health check failed with status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_transcription_endpoint():
    """Test the transcription endpoint with a sample audio file"""
    # Create a simple test audio file (you can replace this with an actual audio file)
    test_audio_path = "test_audio.wav"
    
    if not os.path.exists(test_audio_path):
        print(f"❌ Test audio file not found: {test_audio_path}")
        print("   Please create a test audio file or update the path in this script")
        return False
    
    try:
        with open(test_audio_path, 'rb') as audio_file:
            files = {'audio': (test_audio_path, audio_file, 'audio/wav')}
            
            print(f"🎤 Testing transcription with: {test_audio_path}")
            response = requests.post(
                "http://localhost:8001/transcribe",
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Transcription successful!")
                print(f"   Transcription: {data.get('transcription')}")
                print(f"   Confidence: {data.get('confidence')}")
                print(f"   Language: {data.get('language')}")
                print(f"   Duration: {data.get('duration', 'N/A')} seconds")
                return True
            else:
                print(f"❌ Transcription failed with status: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Transcription test failed: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Audio file not found: {test_audio_path}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing Medical Transcription Service")
    print("=" * 50)
    
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    if not test_health_endpoint():
        print("❌ Service is not running. Please start the service first.")
        print("   Run: python start_service.py")
        return
    
    # Test transcription endpoint
    print("\n2. Testing transcription endpoint...")
    test_transcription_endpoint()
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

if __name__ == "__main__":
    main()
