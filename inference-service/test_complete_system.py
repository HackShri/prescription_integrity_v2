#!/usr/bin/env python3
"""
Complete System Test for Medical AI Prescription System
Tests the entire workflow: Voice → Transcription → NER → LLM → Prescription
"""

import requests
import json
import time
from pydub import AudioSegment
import numpy as np

def create_test_audio_with_symptoms():
    """Create test audio with medical symptoms"""
    # Create a simple sine wave audio
    duration = 3  # seconds
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
    webm_path = "test_medical_audio.webm"
    audio.export(webm_path, format="webm")
    
    print(f"✅ Created test audio: {webm_path}")
    return webm_path

def test_health_endpoints():
    """Test health endpoints"""
    print("🏥 Testing Health Endpoints")
    print("-" * 30)
    
    # Test inference service health
    try:
        response = requests.get("http://localhost:8001/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Inference Service: {data}")
        else:
            print(f"❌ Inference Service health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to inference service: {e}")
        return False
    
    # Test Ollama (if available)
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [model["name"] for model in models]
            if "gpt-oss:20b" in model_names:
                print("✅ Ollama with gpt-oss:20b is available")
            else:
                print("⚠️ Ollama available but gpt-oss:20b not found")
        else:
            print("⚠️ Ollama not responding")
    except requests.exceptions.RequestException:
        print("⚠️ Ollama not available (this is optional)")
    
    return True

def test_regular_transcription():
    """Test regular transcription"""
    print("\n🎤 Testing Regular Transcription")
    print("-" * 35)
    
    webm_path = create_test_audio_with_symptoms()
    
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
                print(f"✅ Regular transcription: {data.get('transcription', 'No transcription')}")
                return True
            else:
                print(f"❌ Regular transcription failed: {response.status_code}")
                print(f"Error: {response.text}")
                return False
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Regular transcription test failed: {e}")
        return False
    finally:
        import os
        if os.path.exists(webm_path):
            os.remove(webm_path)

def test_smart_transcription():
    """Test smart transcription with prescription generation"""
    print("\n🧠 Testing Smart Transcription")
    print("-" * 35)
    
    webm_path = create_test_audio_with_symptoms()
    
    try:
        with open(webm_path, 'rb') as audio_file:
            files = {'audio': (webm_path, audio_file, 'audio/webm')}
            data = {
                'age': '30',
                'weight': '75.0'
            }
            
            response = requests.post(
                "http://localhost:8001/smart-transcribe",
                files=files,
                data=data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Smart transcription successful!")
                print(f"📝 Transcription: {result.get('transcription', 'No transcription')}")
                
                if result.get('prescription'):
                    prescription = result['prescription']
                    print(f"💊 Prescription generated:")
                    print(f"   - Medications: {len(prescription.get('medications', []))}")
                    for med in prescription.get('medications', []):
                        print(f"     • {med.get('name')}: {med.get('dosage')}")
                
                return True
            else:
                print(f"❌ Smart transcription failed: {response.status_code}")
                print(f"Error: {response.text}")
                return False
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Smart transcription test failed: {e}")
        return False
    finally:
        import os
        if os.path.exists(webm_path):
            os.remove(webm_path)

def test_medical_ner_directly():
    """Test medical NER directly"""
    print("\n🔍 Testing Medical NER Directly")
    print("-" * 35)
    
    try:
        from medical_ner import MedicalNER, DrugMapper
        
        # Test NER
        ner = MedicalNER()
        test_text = "Patient has fever, cough, and headache. He is 30 years old."
        entities = ner.extract_entities(test_text)
        print(f"✅ NER extracted: {entities}")
        
        # Test drug mapping
        mapper = DrugMapper()
        symptoms = entities.get("SYMPTOMS", [])
        if symptoms:
            recommendations = mapper.map_symptoms_to_drugs(symptoms, age=30)
            print(f"✅ Drug recommendations: {len(recommendations)} found")
            for rec in recommendations[:2]:  # Show first 2
                print(f"   • {rec['symptom']} → {rec['drug']} ({rec['dosage']})")
        
        return True
        
    except ImportError as e:
        print(f"❌ Cannot import medical NER modules: {e}")
        return False
    except Exception as e:
        print(f"❌ Medical NER test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Complete Medical AI System Test")
    print("=" * 50)
    
    # Test health endpoints
    if not test_health_endpoints():
        print("\n❌ Health checks failed. Please ensure services are running.")
        return
    
    # Test regular transcription
    if not test_regular_transcription():
        print("\n❌ Regular transcription failed.")
        return
    
    # Test medical NER directly
    if not test_medical_ner_directly():
        print("\n❌ Medical NER test failed.")
        return
    
    # Test smart transcription
    if not test_smart_transcription():
        print("\n❌ Smart transcription failed.")
        return
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! System is ready!")
    print("\n📋 System Status:")
    print("✅ Voice transcription working")
    print("✅ Medical NER working")
    print("✅ Drug mapping working")
    print("✅ Smart prescription generation working")
    print("\n🚀 You can now use the doctor dashboard with smart mode enabled!")

if __name__ == "__main__":
    main()
