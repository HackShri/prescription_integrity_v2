#!/usr/bin/env python3
"""
Smart Prescription System
Combines transcription, NER, LLM, and drug mapping for intelligent prescription generation
"""

import json
import logging
from typing import Dict, List, Optional
from medical_ner import MedicalNER, DrugMapper
from medical_llm import MedicalLLM

logger = logging.getLogger(__name__)

class SmartPrescriptionSystem:
    def __init__(self):
        """Initialize the smart prescription system"""
        self.ner = MedicalNER()
        self.drug_mapper = DrugMapper()
        self.llm = MedicalLLM()
        logger.info("✅ Smart Prescription System initialized")
    
    def process_transcription(self, transcription: str, age: int = 25, weight: float = 70.0) -> Dict:
        """
        Process transcribed text and generate prescription recommendations
        
        Args:
            transcription: Transcribed medical text
            age: Patient age
            weight: Patient weight in kg
            
        Returns:
            Dictionary with prescription recommendations
        """
        logger.info(f"Processing transcription: {transcription[:100]}...")
        
        # Step 1: Extract entities using NER
        entities = self.ner.extract_entities(transcription)
        logger.info(f"Extracted entities: {entities}")
        
        # Step 2: Get LLM analysis for symptom-to-disease mapping
        symptoms = entities.get("SYMPTOMS", [])
        diseases = entities.get("DISEASE", [])
        chemicals = entities.get("CHEMICAL", [])
        
        llm_analysis = None
        if symptoms:
            llm_analysis = self.llm.analyze_symptoms(symptoms, age)
            logger.info(f"LLM analysis: {llm_analysis}")
        
        # Step 3: Map to drugs using both rule-based and LLM approaches
        prescription_items = []
        
        # Rule-based mapping for symptoms
        if symptoms:
            symptom_drugs = self.drug_mapper.map_symptoms_to_drugs(symptoms, age)
            prescription_items.extend(symptom_drugs)
        
        # Rule-based mapping for diseases
        if diseases:
            disease_drugs = self.drug_mapper.map_diseases_to_drugs(diseases, age)
            prescription_items.extend(disease_drugs)
        
        # LLM-based recommendations
        if llm_analysis and llm_analysis.get("recommended_drugs"):
            for drug_rec in llm_analysis["recommended_drugs"]:
                prescription_items.append({
                    "drug": drug_rec.get("drug", ""),
                    "dosage": drug_rec.get("dosage", ""),
                    "instructions": drug_rec.get("instructions", ""),
                    "reason": drug_rec.get("reason", "LLM recommendation"),
                    "source": "llm"
                })
        
        # Step 4: Process existing medications mentioned
        existing_meds = []
        if chemicals:
            for chemical in chemicals:
                existing_meds.append({
                    "drug": chemical,
                    "status": "mentioned_in_transcription",
                    "action": "review_dosage"
                })
        
        # Step 5: Generate final prescription
        prescription = self._generate_prescription(
            prescription_items, 
            existing_meds, 
            age, 
            weight,
            llm_analysis
        )
        
        return prescription
    
    def check_drug_interactions(self, drugs: List[str], age: int = 25, weight: float = 70.0) -> List[Dict]:
        """
        Check for potential drug interactions between the given drugs
        
        Args:
            drugs: List of drug names to check
            age: Patient age
            weight: Patient weight in kg
            
        Returns:
            List of interaction warnings
        """
        logger.info(f"Checking interactions for drugs: {drugs}")
        
        interactions = []
        
        # Known drug interactions database (simplified)
        known_interactions = {
            # Warfarin interactions
            ("warfarin", "aspirin"): {
                "severity": "High",
                "description": "Increased bleeding risk",
                "recommendation": "Monitor INR closely, consider alternative to aspirin"
            },
            ("warfarin", "ibuprofen"): {
                "severity": "High",
                "description": "Increased bleeding risk",
                "recommendation": "Avoid NSAIDs, use acetaminophen instead"
            },
            
            # ACE inhibitor interactions
            ("lisinopril", "potassium"): {
                "severity": "Moderate",
                "description": "Risk of hyperkalemia",
                "recommendation": "Monitor potassium levels regularly"
            },
            ("enalapril", "spironolactone"): {
                "severity": "High",
                "description": "Risk of hyperkalemia and hypotension",
                "recommendation": "Monitor potassium and blood pressure closely"
            },
            
            # Statin interactions
            ("atorvastatin", "gemfibrozil"): {
                "severity": "High",
                "description": "Increased risk of rhabdomyolysis",
                "recommendation": "Avoid combination or use lower statin dose"
            },
            ("simvastatin", "diltiazem"): {
                "severity": "Moderate",
                "description": "Increased statin levels",
                "recommendation": "Reduce simvastatin dose"
            },
            
            # Antibiotic interactions
            ("ciprofloxacin", "calcium"): {
                "severity": "Moderate",
                "description": "Reduced antibiotic absorption",
                "recommendation": "Take ciprofloxacin 2 hours before or 6 hours after calcium"
            },
            ("tetracycline", "iron"): {
                "severity": "Moderate",
                "description": "Reduced antibiotic absorption",
                "recommendation": "Separate doses by 2-3 hours"
            },
            
            # Opioid interactions
            ("morphine", "alcohol"): {
                "severity": "High",
                "description": "Increased sedation and respiratory depression",
                "recommendation": "Avoid alcohol completely"
            },
            ("codeine", "alcohol"): {
                "severity": "High",
                "description": "Increased sedation and respiratory depression",
                "recommendation": "Avoid alcohol completely"
            },
            
            # Antidepressant interactions
            ("fluoxetine", "warfarin"): {
                "severity": "Moderate",
                "description": "Increased bleeding risk",
                "recommendation": "Monitor INR more frequently"
            },
            ("sertraline", "warfarin"): {
                "severity": "Moderate",
                "description": "Increased bleeding risk",
                "recommendation": "Monitor INR more frequently"
            }
        }
        
        # Check for known interactions
        drug_lower = [drug.lower().strip() for drug in drugs]
        
        for i in range(len(drug_lower)):
            for j in range(i + 1, len(drug_lower)):
                drug1, drug2 = drug_lower[i], drug_lower[j]
                
                # Check both orders
                for pair in [(drug1, drug2), (drug2, drug1)]:
                    if pair in known_interactions:
                        interaction_info = known_interactions[pair]
                        interactions.append({
                            "drug1": drugs[i],
                            "drug2": drugs[j],
                            "severity": interaction_info["severity"],
                            "description": interaction_info["description"],
                            "recommendation": interaction_info["recommendation"]
                        })
                        break
        
        # Use LLM for additional analysis if available
        try:
            if drugs and len(drugs) > 1:
                llm_analysis = self.llm.analyze_drug_interactions(drugs, age, weight)
                if llm_analysis and llm_analysis.get("interactions"):
                    for interaction in llm_analysis["interactions"]:
                        # Avoid duplicates
                        if not any(
                            existing["drug1"].lower() == interaction["drug1"].lower() and 
                            existing["drug2"].lower() == interaction["drug2"].lower()
                            for existing in interactions
                        ):
                            interactions.append(interaction)
        except Exception as e:
            logger.warning(f"LLM drug interaction analysis failed: {e}")
        
        logger.info(f"Found {len(interactions)} drug interactions")
        return interactions
    
    def _generate_prescription(self, 
                             prescription_items: List[Dict], 
                             existing_meds: List[Dict],
                             age: int,
                             weight: float,
                             llm_analysis: Optional[Dict]) -> Dict:
        """Generate final prescription structure"""
        
        # Remove duplicates and prioritize
        unique_drugs = {}
        for item in prescription_items:
            drug_name = item.get("drug", "").lower()
            if drug_name and drug_name not in unique_drugs:
                unique_drugs[drug_name] = item
        
        # Convert to prescription format
        medications = []
        for drug_name, drug_info in unique_drugs.items():
            medication = {
                "name": drug_name.title(),
                "dosage": drug_info.get("dosage", ""),
                "frequency": self._extract_frequency(drug_info.get("instructions", "")),
                "instructions": drug_info.get("instructions", ""),
                "reason": drug_info.get("reason", "Medical recommendation"),
                "source": drug_info.get("source", "rule_based")
            }
            medications.append(medication)
        
        # Generate prescription summary
        prescription = {
            "medications": medications,
            "existing_medications": existing_meds,
            "patient_info": {
                "age": age,
                "weight": weight
            },
            "analysis": {
                "symptoms_found": llm_analysis.get("possible_diseases", []) if llm_analysis else [],
                "diseases_identified": llm_analysis.get("possible_diseases", []) if llm_analysis else [],
                "general_advice": llm_analysis.get("general_advice", "") if llm_analysis else ""
            },
            "prescription_ready": len(medications) > 0,
            "requires_review": len(existing_meds) > 0 or len(medications) > 3
        }
        
        return prescription
    
    def _extract_frequency(self, instructions: str) -> str:
        """Extract frequency from instructions"""
        instructions_lower = instructions.lower()
        
        if "every 4 hours" in instructions_lower or "4 times" in instructions_lower:
            return "4 times daily"
        elif "every 6 hours" in instructions_lower or "4 times" in instructions_lower:
            return "4 times daily"
        elif "every 8 hours" in instructions_lower or "3 times" in instructions_lower:
            return "3 times daily"
        elif "twice daily" in instructions_lower or "2 times" in instructions_lower:
            return "2 times daily"
        elif "once daily" in instructions_lower or "once a day" in instructions_lower:
            return "Once daily"
        else:
            return "As directed"
    
    def format_for_frontend(self, prescription: Dict) -> Dict:
        """Format prescription for frontend consumption"""
        formatted_medications = []
        
        for med in prescription.get("medications", []):
            formatted_med = {
                "name": med["name"],
                "dosage": med["dosage"],
                "frequency": med["frequency"],
                "instructions": med["instructions"]
            }
            formatted_medications.append(formatted_med)
        
        return {
            "medications": formatted_medications,
            "summary": {
                "total_medications": len(formatted_medications),
                "requires_review": prescription.get("requires_review", False),
                "general_advice": prescription.get("analysis", {}).get("general_advice", "")
            }
        }

def test_smart_prescription():
    """Test the smart prescription system"""
    print("🧠 Testing Smart Prescription System")
    print("=" * 60)
    
    # Initialize system
    system = SmartPrescriptionSystem()
    
    # Test cases
    test_cases = [
        {
            "text": "Patient has fever, cough, and headache. He is 30 years old.",
            "age": 30,
            "weight": 75.0
        },
        {
            "text": "The patient has been on amoxicillin for a persistent cough and now has fever.",
            "age": 25,
            "weight": 65.0
        },
        {
            "text": "Complains of chest pain, shortness of breath, and nausea.",
            "age": 45,
            "weight": 80.0
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test Case {i}:")
        print(f"Text: {test_case['text']}")
        print(f"Age: {test_case['age']}, Weight: {test_case['weight']}kg")
        
        prescription = system.process_transcription(
            test_case['text'], 
            test_case['age'], 
            test_case['weight']
        )
        
        print(f"💊 Prescription: {json.dumps(prescription, indent=2)}")
        
        # Format for frontend
        frontend_format = system.format_for_frontend(prescription)
        print(f"🖥️ Frontend Format: {json.dumps(frontend_format, indent=2)}")

if __name__ == "__main__":
    test_smart_prescription()
