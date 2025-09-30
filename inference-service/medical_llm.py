import json
import logging
from typing import List, Dict, Optional
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are a highly precise medical data structuring tool. Your task is to convert unstructured clinical dictation into a complete and valid JSON object that matches the provided schema EXACTLY.
- You MUST populate EVERY field in the schema.
- For fields where information is missing from the text, you must infer a logical and safe default (e.g., `usageLimit: 1`, `timing: 'with meals'`).
- The 'quantity' MUST be a calculated, purchasable amount (e.g., if frequency is 'twice daily' for '7 days', quantity is '14 tablets').
- Your response MUST be ONLY the JSON object, with no extra text, markdown, or explanations.
"""

def create_final_prescription_prompt(transcription: str, age: int = 30, weight: float = 70.0) -> str:
    default_expiry = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    json_schema = {
      "patientEmail": "<infer or leave as 'patient@example.com'>", "patientMobile": "<infer or leave as '+1234567890'>",
      "age": age, "weight": weight, "height": "<infer a reasonable height in cm or provide a default like 170>",
      "usageLimit": 1, "expiresAt": f"<default to '{default_expiry}'>",
      "instructions": "<provide a brief, general instruction based on the context>",
      "medications": [{
          "name": "<name of the medication>", "dosage": "<e.g., 500mg>",
          "quantity": "<CALCULATE total units to buy, e.g., '14 capsules'>",
          "frequency": "<e.g., twice daily>", "timing": "<e.g., with meals>",
          "duration": "<e.g., 7 days>", "instructions": "<specific instructions for this medication>"
      }]
    }
    return f"""
Task: Populate the following JSON schema based on the provided clinical transcription.
Transcription: "{transcription}"
Patient Info: - Age: {age} - Weight: {weight} kg
Strict JSON Schema to fill:
{json.dumps(json_schema, indent=2)}
Remember the rules:
1. Fill ALL fields. 2. Calculate 'quantity' based on frequency and duration.
3. Your response MUST be the JSON object ONLY.
"""

class MedicalLLM:
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.model_name = os.getenv("OLLAMA_MODEL", "meditron:7b")
        self._ensure_model_available()
    
    def _ensure_model_available(self):
        try:
            import ollama
            
            # Test connection first
            try:
                response = ollama.list()
                logger.info("✅ Successfully connected to Ollama")
            except Exception as conn_error:
                logger.error(f"❌ Could not connect to Ollama: {conn_error}")
                logger.error("Make sure Ollama is running: 'ollama serve'")
                return
            
            # Parse models more robustly
            models = response.get('models', []) if isinstance(response, dict) else []
            model_names = []
            
            for m in models:
                if isinstance(m, dict):
                    # Try different possible keys for model name
                    name = m.get('name') or m.get('model') or m.get('id')
                    if name:
                        model_names.append(name)
                        # Also add base name without tag if it has one
                        if ':' in name:
                            base_name = name.split(':')[0]
                            model_names.append(base_name)
            
            logger.info(f"Available models: {model_names}")
            
            if not model_names:
                logger.warning("No Ollama models found. Please pull a model:")
                logger.warning("For medical use: ollama pull meditron:7b")
                logger.warning("Or general use: ollama pull llama3.2:latest")
                return
            
            # Check if our desired model exists (with flexible matching)
            model_found = False
            for available_model in model_names:
                if (self.model_name == available_model or 
                    self.model_name.split(':')[0] == available_model.split(':')[0]):
                    self.model_name = available_model
                    model_found = True
                    break
            
            if not model_found:
                logger.warning(f"Model '{self.model_name}' not found. Using '{model_names[0]}' instead.")
                logger.warning(f"To use meditron, run: ollama pull meditron:7b")
                self.model_name = model_names[0]
            else:
                logger.info(f"✅ LLM Model '{self.model_name}' is available.")
                
        except ImportError:
            logger.error("❌ 'ollama' package not installed. Run: pip install ollama")
        except Exception as e:
            logger.error(f"❌ Unexpected error checking Ollama: {e}")

    def generate_full_prescription(self, transcription: str, age: int, weight: float) -> Dict:
        prompt = create_final_prescription_prompt(transcription, age, weight)
        try:
            response_text = self._call_ollama(prompt)
            return self._parse_response(response_text)
        except Exception as e:
            logger.error(f"LLM prescription generation failed: {e}")
            return self._create_fallback_prescription(transcription, age, weight)
    
    def _call_ollama(self, prompt: str) -> str:
        try:
            import ollama
        except ImportError:
            raise Exception("ollama package not installed")
        
        try:
            logger.info(f"Calling Ollama with model: {self.model_name}")
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': prompt}
                ],
                options={
                    "temperature": 0.1,
                    "timeout": 30  # 30 second timeout
                }
            )
            
            if isinstance(response, dict):
                if 'message' in response and isinstance(response['message'], dict):
                    content = response['message'].get('content', '')
                    if content:
                        logger.info("✅ Got response from Ollama")
                        return content
                if 'content' in response:
                    content = response.get('content', '')
                    if content:
                        logger.info("✅ Got response from Ollama")
                        return content
            
            raise ValueError('Empty or invalid response from ollama')
            
        except Exception as e:
            logger.error(f"Error calling Ollama: {e}")
            raise

    def _parse_response(self, response: str) -> Dict:
        try:
            # Clean the response
            response = response.strip()
            
            # Find JSON object
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx != 0:
                json_str = response[start_idx:end_idx]
                parsed = json.loads(json_str)
                logger.info("✅ Successfully parsed LLM response")
                return parsed
            else:
                raise ValueError("No JSON object found in response")
                
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to decode JSON from LLM response: {response[:200]}... | Error: {e}")
            raise ValueError("LLM response was not valid JSON")

    def _create_fallback_prescription(self, transcription: str, age: int, weight: float) -> Dict:
        """Create a basic prescription when LLM fails"""
        logger.info("Creating fallback prescription")
        default_expiry = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        return {
            "patientEmail": "patient@example.com",
            "patientMobile": "+1234567890",
            "age": age,
            "weight": weight,
            "height": 170,
            "usageLimit": 1,
            "expiresAt": default_expiry,
            "instructions": "Please follow the prescribed medication schedule and consult with your doctor if you have any concerns.",
            "medications": [{
                "name": "Consultation Required",
                "dosage": "As prescribed",
                "quantity": "1 consultation",
                "frequency": "As needed",
                "timing": "With consultation",
                "duration": "As advised",
                "instructions": f"Transcription: {transcription}. Please consult with doctor for proper prescription."
            }]
        }

if __name__ == "__main__":
    llm = MedicalLLM()
    test_transcription = "The patient has a bacterial infection. Put him on Amoxicillin 500mg, twice a day for seven days with meals. For the fever, he can take Ibuprofen as needed."
    prescription_json = llm.generate_full_prescription(test_transcription, age=42, weight=85)
    print(json.dumps(prescription_json, indent=2))