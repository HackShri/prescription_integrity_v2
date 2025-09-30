import json
import logging
from typing import Dict, List
import os

from langchain_ollama import OllamaLLM as Ollama
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from langchain.docstore.document import Document
from langchain_community.vectorstores.utils import filter_complex_metadata

logger = logging.getLogger(__name__)

# Disable external telemetry/noise from Chroma/PostHog in restricted networks
os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("CHROMA_TELEMETRY_IMPLEMENTATION", "none")
os.environ.setdefault("POSTHOG_DISABLED", "true")

for noisy_logger in [
    "chromadb.telemetry",
    "chromadb.telemetry.product.posthog",
    "posthog",
    "urllib3.connectionpool",
]:
    try:
        logging.getLogger(noisy_logger).setLevel(logging.ERROR)
    except Exception:
        pass

class RAGPrescriptionGenerator:
    def __init__(self, data_path="medical_data.json"):
        logger.info("Initializing RAG Prescription Generator...")
        self.model_name = os.getenv("OLLAMA_MODEL", "meditron:7b")
        # Resolve data_path relative to this file if a relative path was passed
        if not os.path.isabs(data_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(base_dir, data_path)

        # Fail fast and provide a clear message if the KB is missing
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Knowledge base file not found: {data_path}")

        self.llm = Ollama(model=self.model_name, temperature=0.1, format="json")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        # Load full KB and keep a lookup map by condition_name for rehydration later
        self._raw_kb = self._load_data(data_path)
        self._condition_by_name = {
            item.get("condition_name"): item for item in self._raw_kb if item.get("condition_name")
        }
        self.vector_store = self._create_vector_store_from_items(self._raw_kb)
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 1})
        self.prompt_template = self._get_prompt_template()
        
        self.rag_chain = (
            RunnablePassthrough.assign(context=self.retriever)
            | self.prompt_template
            | self.llm
            | StrOutputParser()
        )
        logger.info("✅ RAG Generator initialized successfully.")

    def _load_data(self, data_path: str):
        logger.info(f"Loading knowledge base from {data_path}...")
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Ensure the KB is a list of items
                if isinstance(data, dict):
                    # If single object present, wrap in a list
                    return [data]
                if not isinstance(data, list):
                    raise ValueError(f"Unexpected KB format (expected list or dict) in {data_path}")
                return data
        except Exception as e:
            logger.error(f"❌ Failed to load or parse {data_path}: {e}")
            raise

    def _create_vector_store_from_items(self, items: List[Dict]):
        documents = []
        for item in items:
            search_content = f"Condition: {item['condition_name']}. Symptoms: {', '.join(item.get('symptoms', []))}."
            # Keep only simple metadata to avoid Chroma rejection; we rehydrate by condition_name later
            simple_metadata = {"condition_name": item.get("condition_name", "")}
            documents.append(Document(page_content=search_content, metadata=simple_metadata))

        filtered_documents = filter_complex_metadata(documents)
        logger.info(f"Creating vector store with {len(filtered_documents)} documents...")
        return Chroma.from_documents(documents=filtered_documents, embedding=self.embeddings)

    def _get_prompt_template(self) -> PromptTemplate:
        template = """
        You are a medical prescription assistant. Based on the provided context, generate a JSON array of medications.

        For EACH drug name listed in the context's `suggested_drugs`, create one object with ALL of the following keys:
        - name: The exact drug name from suggested_drugs
        - dosage: Standard dosage (e.g., "500mg" for Acetaminophen, "10mg" for Cetirizine, "200mg" for Ibuprofen)
        - frequency: Standard frequency (e.g., "twice daily", "once daily", "thrice daily")
        - timing: When to take (e.g., "after meals", "before breakfast", "with meals")
        - duration: Treatment duration (e.g., "5 days", "7 days", "3 days")
        - quantity: Total quantity needed (calculate based on frequency and duration)
        - instructions: Brief safety instruction

        Use these standard dosages:
        - Acetaminophen: 500mg
        - Ibuprofen: 200-400mg
        - Cetirizine: 10mg
        - Loratadine: 10mg
        - Antacid: 10ml
        - Ondansetron: 4mg
        - Loperamide: 2mg
        - Naproxen: 250mg
        - Hydrocortisone Cream: Apply thin layer
        - Dextromethorphan Syrup: 10ml

        Output ONLY a raw JSON array (no comments, no backticks, no extra text).

        CONTEXT:
        {context}

        USER'S DESCRIPTION:
        "{question}"

        medications:
        """
        return PromptTemplate(template=template, input_variables=["context", "question"])

    def _get_default_medication_details(self, drug_name: str) -> Dict:
        """Returns default medication details based on drug name"""
        medication_defaults = {
            "Acetaminophen": {
                "dosage": "500mg",
                "frequency": "every 6 hours",
                "timing": "after meals",
                "duration": "5 days",
                "quantity": 20,
                "instructions": "Do not exceed 4g per day. Take with water."
            },
            "Ibuprofen": {
                "dosage": "400mg",
                "frequency": "twice daily",
                "timing": "after meals",
                "duration": "5 days",
                "quantity": 10,
                "instructions": "Take with food to avoid stomach upset."
            },
            "Cetirizine": {
                "dosage": "10mg",
                "frequency": "once daily",
                "timing": "at bedtime",
                "duration": "7 days",
                "quantity": 7,
                "instructions": "May cause drowsiness. Avoid driving."
            },
            "Loratadine": {
                "dosage": "10mg",
                "frequency": "once daily",
                "timing": "with breakfast",
                "duration": "7 days",
                "quantity": 7,
                "instructions": "Non-drowsy antihistamine."
            },
            "Antacid": {
                "dosage": "10ml",
                "frequency": "thrice daily",
                "timing": "after meals",
                "duration": "5 days",
                "quantity": 1,
                "instructions": "Shake well before use."
            },
            "Ondansetron": {
                "dosage": "4mg",
                "frequency": "twice daily",
                "timing": "as needed",
                "duration": "3 days",
                "quantity": 6,
                "instructions": "For nausea and vomiting."
            },
            "Loperamide": {
                "dosage": "2mg",
                "frequency": "after each loose stool",
                "timing": "as needed",
                "duration": "2 days",
                "quantity": 10,
                "instructions": "Do not exceed 16mg per day."
            },
            "Naproxen": {
                "dosage": "250mg",
                "frequency": "twice daily",
                "timing": "with meals",
                "duration": "5 days",
                "quantity": 10,
                "instructions": "Take with food. For pain and inflammation."
            },
            "Hydrocortisone Cream": {
                "dosage": "0.5% cream",
                "frequency": "twice daily",
                "timing": "morning and evening",
                "duration": "7 days",
                "quantity": 1,
                "instructions": "Apply thin layer to affected area."
            },
            "Dextromethorphan Syrup": {
                "dosage": "10ml",
                "frequency": "every 6 hours",
                "timing": "as needed",
                "duration": "5 days",
                "quantity": 1,
                "instructions": "For dry cough. Do not exceed 40ml per day."
            }
        }
        
        # Return defaults if found, otherwise generic defaults
        return medication_defaults.get(drug_name, {
            "dosage": "as directed",
            "frequency": "twice daily",
            "timing": "after meals",
            "duration": "5 days",
            "quantity": 10,
            "instructions": "Take as directed by physician."
        })

    def generate(self, transcription: str) -> Dict:
        logger.info(f"Generating prescription for: '{transcription}'")
        try:
            # Retrieve matching condition from knowledge base
            retrieved_docs = self.retriever.invoke(transcription)
            if not retrieved_docs:
                return {"error": "Could not find a matching condition in the knowledge base."}
            
            retrieved_meta = retrieved_docs[0].metadata or {}
            condition_name = retrieved_meta.get("condition_name", "Unknown")
            full_context = self._condition_by_name.get(condition_name, {})
            suggested_drugs = full_context.get("suggested_drugs", [])
            general_advice = full_context.get("general_advice", "Follow medication instructions carefully.")
            
            # If no drugs are suggested for this condition
            if not suggested_drugs:
                logger.warning(f"No medications found for condition: {condition_name}")
                return {
                    "general_advice": general_advice,
                    "medications": [],
                    "condition": condition_name
                }
            
            # Build medications list with proper structure
            medications = []
            for drug_info in suggested_drugs:
                drug_name = drug_info.get("name", "")
                if drug_name:
                    # Get default details for this medication
                    med_details = self._get_default_medication_details(drug_name)
                    
                    medication = {
                        "name": drug_name,
                        "dosage": med_details["dosage"],
                        "frequency": med_details["frequency"],
                        "timing": med_details["timing"],
                        "duration": med_details["duration"],
                        "quantity": med_details["quantity"],
                        "instructions": med_details["instructions"]
                    }
                    medications.append(medication)
            
            # Try to enhance with LLM if available
            try:
                llm_response_str = self.rag_chain.invoke({"context": full_context, "question": transcription})
                
                # Parse LLM response
                start_idx = llm_response_str.find('[')
                end_idx = llm_response_str.rfind(']')
                if start_idx != -1 and end_idx != -1:
                    llm_response_str = llm_response_str[start_idx:end_idx+1]
                    llm_medications = json.loads(llm_response_str)
                    
                    # Use LLM response if it's valid
                    if llm_medications and isinstance(llm_medications, list):
                        medications = llm_medications
                        logger.info("Using LLM-enhanced medication details")
            except Exception as llm_err:
                logger.warning(f"LLM enhancement failed, using defaults: {llm_err}")
                # Continue with default medications
            
            result = {
                "general_advice": general_advice,
                "medications": medications,
                "condition": condition_name
            }
            
            logger.info(f"✅ Generated prescription with {len(medications)} medication(s)")
            return result
            
        except Exception as e:
            logger.error(f"❌ RAG chain failed: {e}")
            return {"error": "Failed to generate prescription details."}