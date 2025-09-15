#!/usr/bin/env python3
"""
Test script to verify audio conversion from WEBM to 16kHz WAV
This simulates what happens when the browser sends a WEBM file
"""

import os
import tempfile
import requests
from pydub import AudioSegment
import numpy as np

def create_test_webm():
    """Create a test WEBM file with some audio content"""
    # Create a simple sine wave audio
    duration = 2  # seconds
    sample_rate = 44100
    frequency = 440  # A4 note
    
    # Generate sine wave
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio_data = np.sin(2 * np.pi * frequency * t)
    
    # Convert to 16-bit integers
    audio_data = (audio_data * 32767).astype(np.int16)
    
    # Create AudioSegment
    audio = AudioSegment(
        audio_data.tobytes(),
        frame_rate=sample_rate,
        sample_width=2,  # 16-bit
        channels=1
    )
    
    # Save as WEBM
    webm_path = "test_audio.webm"
    audio.export(webm_path, format="webm")
    
    print(f"✅ Created test WEBM file: {webm_path}")
    return webm_path

def test_conversion_locally():
    """Test the conversion functions locally"""
    print("🧪 Testing audio conversion locally...")
    
    # Import the conversion functions
    import sys
    sys.path.append('.')
    from inference_service import convert_and_resample_audio, load_audio_for_whisper
    
    # Create test WEBM
    webm_path = create_test_webm()
    
    try:
        # Test conversion
        wav_path = "test_converted.wav"
        success = convert_and_resample_audio(webm_path, wav_path, target_sr=16000)
        
        if success:
            print("✅ Audio conversion successful")
            
            # Test loading
            audio, sr = load_audio_for_whisper(wav_path, target_sr=16000)
            print(f"✅ Audio loaded: {len(audio)} samples, {sr} Hz")
            
            # Clean up
            os.remove(webm_path)
            os.remove(wav_path)
            print("✅ Test files cleaned up")
            
        else:
            print("❌ Audio conversion failed")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        # Clean up on error
        if os.path.exists(webm_path):
            os.remove(webm_path)

def test_service_endpoint():
    """Test the actual service endpoint"""
    print("\n🌐 Testing service endpoint...")
    
    # Create test WEBM
    webm_path = create_test_webm()
    
    try:
        with open(webm_path, 'rb') as audio_file:
            files = {'audio': (webm_path, audio_file, 'audio/webm')}
            
            response = requests.post(
                "http://localhost:8001/transcribe",
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Service endpoint test successful!")
                print(f"   Transcription: {data.get('transcription')}")
                print(f"   Duration: {data.get('duration', 'N/A')} seconds")
            else:
                print(f"❌ Service test failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Service test failed: {e}")
    finally:
        # Clean up
        if os.path.exists(webm_path):
            os.remove(webm_path)

def main():
    """Main test function"""
    print("🎵 Testing Audio Conversion for Medical Transcription")
    print("=" * 60)
    
    # Test local conversion
    test_conversion_locally()
    
    # Test service endpoint
    test_service_endpoint()
    
    print("\n" + "=" * 60)
    print("🏁 Audio conversion tests completed!")

if __name__ == "__main__":
    main()
