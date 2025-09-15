#!/usr/bin/env python3
"""
Medical Named Entity Recognition and Drug Mapping System
Uses spaCy with BC5CDR model for medical entity extraction
"""

import spacy
import json
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class MedicalNER:
    def __init__(self):
        """Initialize the medical NER system"""
        try:
            # Load the BC5CDR model for medical entity recognition
            self.nlp = spacy.load("en_ner_bc5cdr_md")
            logger.info("✅ Medical NER model loaded successfully")
        except OSError:
            logger.error("❌ BC5CDR model not found. Please install: python -m spacy download en_ner_bc5cdr_md")
            raise
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract medical entities from text
        Returns: {"CHEMICAL": [...], "DISEASE": [...], "SYMPTOMS": [...]}
        """
        doc = self.nlp(text)
        
        entities = {
            "CHEMICAL": [],      # Drugs/medications
            "DISEASE": [],       # Diseases/conditions
            "SYMPTOMS": []       # Symptoms (we'll extract these manually)
        }
        
        for ent in doc.ents:
            if ent.label_ == "CHEMICAL":
                entities["CHEMICAL"].append(ent.text.lower())
            elif ent.label_ == "DISEASE":
                entities["DISEASE"].append(ent.text.lower())
        
        # Extract symptoms manually (common medical symptoms)
        symptoms = self._extract_symptoms(text)
        entities["SYMPTOMS"] = symptoms
        
        # Remove duplicates
        for key in entities:
            entities[key] = list(set(entities[key]))
        
        logger.info(f"Extracted entities: {entities}")
        return entities
    
    def _extract_symptoms(self, text: str) -> List[str]:
        """Extract symptoms from text using keyword matching"""
        symptom_keywords = [
            "fever", "cough", "headache", "pain", "ache", "nausea", "vomiting",
            "diarrhea", "constipation", "fatigue", "weakness", "dizziness",
            "shortness of breath", "chest pain", "abdominal pain", "back pain",
            "sore throat", "runny nose", "congestion", "sneezing", "itchy",
            "rash", "swelling", "inflammation", "bleeding", "bruising",
            "insomnia", "anxiety", "depression", "confusion", "memory loss"
        ]
        
        text_lower = text.lower()
        found_symptoms = []
        
        for symptom in symptom_keywords:
            if symptom in text_lower:
                found_symptoms.append(symptom)
        
        return found_symptoms

class DrugMapper:
    def __init__(self):
        """Initialize drug mapping system"""
        self.drug_database = self._load_drug_database()
    
    def _load_drug_database(self) -> Dict:
        """Load drug mapping database"""
        return {
            # Fever and pain medications
            "fever": {
                "drugs": ["paracetamol", "acetaminophen", "ibuprofen"],
                "dosage_adult": "500-1000mg every 6-8 hours",
                "dosage_child": "10-15mg/kg every 6-8 hours",
                "instructions": "Take with food. Do not exceed 4g per day."
            },
            "headache": {
                "drugs": ["paracetamol", "ibuprofen", "aspirin"],
                "dosage_adult": "500-1000mg every 6-8 hours",
                "dosage_child": "10-15mg/kg every 6-8 hours",
                "instructions": "Take with food. Avoid if allergic to aspirin."
            },
            "cough": {
                "drugs": ["dextromethorphan", "guaifenesin", "codeine"],
                "dosage_adult": "15-30mg every 4-6 hours",
                "dosage_child": "5-10mg every 4-6 hours",
                "instructions": "Take with water. Avoid driving if drowsy."
            },
            "nausea": {
                "drugs": ["ondansetron", "metoclopramide", "dimenhydrinate"],
                "dosage_adult": "4-8mg every 8 hours",
                "dosage_child": "0.1mg/kg every 8 hours",
                "instructions": "Take 30 minutes before meals."
            },
            "diarrhea": {
                "drugs": ["loperamide", "bismuth subsalicylate"],
                "dosage_adult": "2-4mg initially, then 2mg after each loose stool",
                "dosage_child": "0.1mg/kg initially, then 0.05mg/kg after each loose stool",
                "instructions": "Stay hydrated. Do not exceed 8mg per day."
            },
            "constipation": {
                "drugs": ["senna", "bisacodyl", "lactulose"],
                "dosage_adult": "8.6mg once daily",
                "dosage_child": "4.3mg once daily",
                "instructions": "Take at bedtime. Increase fluid intake."
            },
            "sore throat": {
                "drugs": ["amoxicillin", "penicillin", "azithromycin"],
                "dosage_adult": "500mg every 8 hours for 7-10 days",
                "dosage_child": "25-45mg/kg/day in divided doses",
                "instructions": "Complete full course. Take with food."
            },
            "chest pain": {
                "drugs": ["nitroglycerin", "aspirin", "morphine"],
                "dosage_adult": "0.3-0.6mg sublingually every 5 minutes",
                "dosage_child": "Not recommended without medical supervision",
                "instructions": "Seek immediate medical attention if severe."
            }
        }
    
    def map_symptoms_to_drugs(self, symptoms: List[str], age: int = 25) -> List[Dict]:
        """
        Map symptoms to appropriate medications
        Returns list of drug recommendations with dosages
        """
        recommendations = []
        
        for symptom in symptoms:
            if symptom in self.drug_database:
                drug_info = self.drug_database[symptom]
                
                # Determine dosage based on age
                is_child = age < 18
                dosage = drug_info["dosage_child"] if is_child else drug_info["dosage_adult"]
                
                for drug in drug_info["drugs"]:
                    recommendation = {
                        "symptom": symptom,
                        "drug": drug,
                        "dosage": dosage,
                        "instructions": drug_info["instructions"],
                        "age_group": "child" if is_child else "adult"
                    }
                    recommendations.append(recommendation)
        
        return recommendations
    
    def map_diseases_to_drugs(self, diseases: List[str], age: int = 25) -> List[Dict]:
        """
        Map diseases to appropriate medications
        """
        # This would be expanded with a comprehensive disease database
        disease_mapping = {
            "hypertension": {
                "drugs": ["lisinopril", "amlodipine", "hydrochlorothiazide"],
                "dosage_adult": "10mg once daily",
                "dosage_child": "0.07mg/kg once daily",
                "instructions": "Monitor blood pressure regularly."
            },
            "diabetes": {
                "drugs": ["metformin", "insulin", "glipizide"],
                "dosage_adult": "500mg twice daily",
                "dosage_child": "Not recommended without endocrinologist",
                "instructions": "Monitor blood glucose levels."
            }
        }
        
        recommendations = []
        for disease in diseases:
            if disease in disease_mapping:
                drug_info = disease_mapping[disease]
                is_child = age < 18
                dosage = drug_info["dosage_child"] if is_child else drug_info["dosage_adult"]
                
                for drug in drug_info["drugs"]:
                    recommendation = {
                        "disease": disease,
                        "drug": drug,
                        "dosage": dosage,
                        "instructions": drug_info["instructions"],
                        "age_group": "child" if is_child else "adult"
                    }
                    recommendations.append(recommendation)
        
        return recommendations

def test_medical_ner():
    """Test the medical NER system"""
    print("🧪 Testing Medical NER System")
    print("=" * 50)
    
    # Initialize NER
    ner = MedicalNER()
    
    # Test cases
    test_cases = [
        "The patient has been on amoxicillin for a persistent cough.",
        "Patient complains of fever, headache, and nausea.",
        "History of hypertension and diabetes mellitus.",
        "Severe chest pain with shortness of breath."
    ]
    
    for text in test_cases:
        print(f"\n📝 Text: {text}")
        entities = ner.extract_entities(text)
        print(f"🔍 Entities: {entities}")
    
    # Test drug mapping
    print("\n💊 Testing Drug Mapping")
    print("=" * 30)
    
    mapper = DrugMapper()
    symptoms = ["fever", "cough", "headache"]
    recommendations = mapper.map_symptoms_to_drugs(symptoms, age=30)
    
    for rec in recommendations:
        print(f"✅ {rec['symptom']} → {rec['drug']} ({rec['dosage']})")

if __name__ == "__main__":
    test_medical_ner()
