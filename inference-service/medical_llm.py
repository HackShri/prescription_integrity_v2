#!/usr/bin/env python3
"""
Medical LLM Integration with Ollama and Llama 3.2
Handles symptom-to-disease mapping and drug recommendations
"""

import requests
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class MedicalLLM:
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        """Initialize the medical LLM system"""
        self.ollama_url = ollama_url
        self.model_name = "gpt-oss:20b"
        self._ensure_model_available()
    
    def _ensure_model_available(self):
        """Ensure Llama 3.2 model is available in Ollama"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]
                
                if self.model_name not in model_names:
                    logger.warning(f"Model {self.model_name} not found. Available models: {model_names}")
                    logger.info("Please run: ollama pull gpt-oss:20b")
                else:
                    logger.info(f"✅ Model {self.model_name} is available")
            else:
                logger.error("❌ Cannot connect to Ollama. Please ensure Ollama is running.")
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Ollama connection failed: {e}")
    
    def analyze_symptoms(self, symptoms: List[str], age: int = 25) -> Dict:
        """
        Analyze symptoms and predict possible diseases
        """
        symptoms_text = ", ".join(symptoms)
        
        prompt = f"""
        As a medical AI assistant, analyze these symptoms and provide:
        1. Possible diseases/conditions
        2. Recommended medications
        3. Dosage based on age {age}
        4. Instructions for taking medications
        
        Symptoms: {symptoms_text}
        Patient Age: {age}
        
        Respond in JSON format:
        {{
            "possible_diseases": ["disease1", "disease2"],
            "recommended_drugs": [
                {{
                    "drug": "drug_name",
                    "dosage": "dosage_info",
                    "instructions": "how_to_take",
                    "reason": "why_this_drug"
                }}
            ],
            "general_advice": "general_medical_advice"
        }}
        """
        
        try:
            response = self._call_ollama(prompt)
            return self._parse_medical_response(response)
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            return self._fallback_analysis(symptoms, age)
    
    def get_drug_recommendations(self, disease: str, age: int = 25) -> List[Dict]:
        """
        Get drug recommendations for a specific disease
        """
        prompt = f"""
        As a medical AI, recommend appropriate medications for {disease} in a {age}-year-old patient.
        
        Provide:
        1. Primary medication
        2. Alternative medications
        3. Dosage information
        4. Instructions
        5. Contraindications
        
        Respond in JSON format:
        {{
            "primary_drug": {{
                "name": "drug_name",
                "dosage": "dosage_info",
                "instructions": "how_to_take"
            }},
            "alternatives": [
                {{
                    "name": "drug_name",
                    "dosage": "dosage_info",
                    "instructions": "how_to_take"
                }}
            ],
            "contraindications": ["warning1", "warning2"]
        }}
        """
        
        try:
            response = self._call_ollama(prompt)
            return self._parse_drug_response(response)
        except Exception as e:
            logger.error(f"Drug recommendation failed: {e}")
            return self._fallback_drug_recommendation(disease, age)
    
    def analyze_drug_interactions(self, drugs: List[str], age: int = 25, weight: float = 70.0) -> Dict:
        """
        Analyze potential drug interactions between multiple medications
        """
        drugs_text = ", ".join(drugs)
        
        prompt = f"""
        As a medical AI assistant, analyze these medications for potential drug interactions:
        
        Medications: {drugs_text}
        Patient Age: {age}
        Patient Weight: {weight} kg
        
        Check for:
        1. Pharmacokinetic interactions (absorption, distribution, metabolism, excretion)
        2. Pharmacodynamic interactions (additive, synergistic, or antagonistic effects)
        3. Contraindications
        4. Severity levels (Low, Moderate, High)
        5. Clinical recommendations
        
        Respond in JSON format:
        {{
            "interactions": [
                {{
                    "drug1": "drug_name",
                    "drug2": "drug_name",
                    "severity": "High/Moderate/Low",
                    "description": "interaction_description",
                    "recommendation": "clinical_recommendation"
                }}
            ],
            "summary": "overall_assessment",
            "contraindications": ["warning1", "warning2"]
        }}
        """
        
        try:
            response = self._call_ollama(prompt)
            return self._parse_interaction_response(response)
        except Exception as e:
            logger.error(f"Drug interaction analysis failed: {e}")
            return self._fallback_interaction_analysis(drugs, age, weight)
    
    def _call_ollama(self, prompt: str) -> str:
        """Call Ollama API using the correct format"""
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,  # Lower temperature for medical accuracy
                "top_p": 0.9,
                "num_predict": 1000  # Use num_predict instead of max_tokens
            }
        }
        
        response = requests.post(
            f"{self.ollama_url}/api/generate",
            json=payload,
            timeout=60  # Increased timeout for larger model
        )
        
        if response.status_code == 200:
            return response.json().get("response", "")
        else:
            raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
    
    def _parse_medical_response(self, response: str) -> Dict:
        """Parse LLM response for medical analysis"""
        try:
            # Try to extract JSON from response
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return self._fallback_analysis([], 25)
        except json.JSONDecodeError:
            return self._fallback_analysis([], 25)
    
    def _parse_drug_response(self, response: str) -> List[Dict]:
        """Parse LLM response for drug recommendations"""
        try:
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                data = json.loads(json_str)
                return [data.get("primary_drug", {})] + data.get("alternatives", [])
            else:
                return self._fallback_drug_recommendation("", 25)
        except json.JSONDecodeError:
            return self._fallback_drug_recommendation("", 25)
    
    def _fallback_analysis(self, symptoms: List[str], age: int) -> Dict:
        """Fallback analysis when LLM fails"""
        return {
            "possible_diseases": ["general illness"],
            "recommended_drugs": [
                {
                    "drug": "paracetamol",
                    "dosage": "500mg every 6-8 hours" if age >= 18 else "10-15mg/kg every 6-8 hours",
                    "instructions": "Take with food. Consult doctor if symptoms persist.",
                    "reason": "General pain and fever relief"
                }
            ],
            "general_advice": "Rest, stay hydrated, and consult a healthcare provider if symptoms worsen."
        }
    
    def _parse_interaction_response(self, response: str) -> Dict:
        """Parse LLM response for drug interaction analysis"""
        try:
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return self._fallback_interaction_analysis([], 25, 70.0)
        except json.JSONDecodeError:
            return self._fallback_interaction_analysis([], 25, 70.0)
    
    def _fallback_interaction_analysis(self, drugs: List[str], age: int, weight: float) -> Dict:
        """Fallback interaction analysis when LLM fails"""
        return {
            "interactions": [],
            "summary": "Unable to analyze drug interactions automatically. Please consult a pharmacist or physician.",
            "contraindications": ["Always consult healthcare provider before combining medications"]
        }
    
    def _fallback_drug_recommendation(self, disease: str, age: int) -> List[Dict]:
        """Fallback drug recommendation when LLM fails"""
        return [
            {
                "name": "paracetamol",
                "dosage": "500mg every 6-8 hours" if age >= 18 else "10-15mg/kg every 6-8 hours",
                "instructions": "Take with food. Consult doctor for proper diagnosis."
            }
        ]

def test_medical_llm():
    """Test the medical LLM system"""
    print("🤖 Testing Medical LLM System")
    print("=" * 50)
    
    # Initialize LLM
    llm = MedicalLLM()
    
    # Test symptom analysis
    symptoms = ["fever", "cough", "headache"]
    print(f"\n🔍 Analyzing symptoms: {symptoms}")
    
    analysis = llm.analyze_symptoms(symptoms, age=30)
    print(f"📊 Analysis: {json.dumps(analysis, indent=2)}")
    
    # Test drug recommendations
    disease = "hypertension"
    print(f"\n💊 Getting drug recommendations for: {disease}")
    
    drugs = llm.get_drug_recommendations(disease, age=45)
    print(f"💉 Recommendations: {json.dumps(drugs, indent=2)}")

if __name__ == "__main__":
    test_medical_llm()
