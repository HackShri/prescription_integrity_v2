#!/usr/bin/env python3
"""
Test script for Ollama integration with gpt-oss:20b model
"""

import requests
import json

def test_ollama_connection():
    """Test basic Ollama connection"""
    print("🔗 Testing Ollama Connection...")
    
    try:
        response = requests.get("http://localhost:11434/api/version", timeout=5)
        if response.status_code == 200:
            version = response.json().get("version", "unknown")
            print(f"✅ Ollama is running (version: {version})")
            return True
        else:
            print(f"❌ Ollama version check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        return False

def test_available_models():
    """Test available models"""
    print("\n📋 Checking Available Models...")
    
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=10)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [model["name"] for model in models]
            
            print(f"Available models: {model_names}")
            
            if "gpt-oss:20b" in model_names:
                print("✅ gpt-oss:20b model is available")
                return True
            else:
                print("❌ gpt-oss:20b model not found")
                print("Please run: ollama pull gpt-oss:20b")
                return False
        else:
            print(f"❌ Failed to get models: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error getting models: {e}")
        return False

def test_model_generation():
    """Test model generation"""
    print("\n🤖 Testing Model Generation...")
    
    try:
        payload = {
            "model": "gpt-oss:20b",
            "prompt": "Hello, how are you?",
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 50
            }
        }
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Model response: {result.get('response', 'No response')}")
            return True
        else:
            print(f"❌ Generation failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Generation test failed: {e}")
        return False

def test_medical_prompt():
    """Test medical-specific prompt"""
    print("\n🏥 Testing Medical Prompt...")
    
    try:
        payload = {
            "model": "gpt-oss:20b",
            "prompt": """As a medical AI assistant, analyze these symptoms and provide:
1. Possible diseases/conditions
2. Recommended medications
3. Dosage based on age 30
4. Instructions for taking medications

Symptoms: fever, cough, headache
Patient Age: 30

Respond in JSON format:
{
    "possible_diseases": ["disease1", "disease2"],
    "recommended_drugs": [
        {
            "drug": "drug_name",
            "dosage": "dosage_info",
            "instructions": "how_to_take",
            "reason": "why_this_drug"
        }
    ],
    "general_advice": "general_medical_advice"
}""",
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 500
            }
        }
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Medical response: {result.get('response', 'No response')[:200]}...")
            return True
        else:
            print(f"❌ Medical prompt failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Medical prompt test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing Ollama Integration with gpt-oss:20b")
    print("=" * 60)
    
    # Test connection
    if not test_ollama_connection():
        print("\n❌ Ollama connection failed. Please ensure Ollama is running.")
        return
    
    # Test models
    if not test_available_models():
        print("\n❌ Model not available. Please pull the model first.")
        return
    
    # Test basic generation
    if not test_model_generation():
        print("\n❌ Basic generation failed.")
        return
    
    # Test medical prompt
    if not test_medical_prompt():
        print("\n❌ Medical prompt failed.")
        return
    
    print("\n" + "=" * 60)
    print("🎉 All tests passed! Ollama integration is working!")

if __name__ == "__main__":
    main()
