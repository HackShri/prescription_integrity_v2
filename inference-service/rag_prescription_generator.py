import json
import logging
from typing import Dict, List

import os
from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import OllamaLLM as Ollama

# Import new parsers
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field


logger = logging.getLogger(__name__)

# --- Pydantic Models for Structured Output ---
# Define the precise JSON structure you want the LLM to output.
# This makes parsing reliable and predictable.
class Medication(BaseModel):
    name: str = Field(description="The exact drug name from the context.")
    dosage: str = Field(description="A standard dosage, e.g., '500mg' or '10ml'.")
    frequency: str = Field(description="How often to take the medication, e.g., 'twice daily'.")
    timing: str = Field(description="When to take the medication, e.g., 'after meals'.")
    duration: str = Field(description="The total duration of the treatment, e.g., '7 days'.")
    quantity: int = Field(description="Total number of units to dispense, calculated from frequency and duration.")
    instructions: str = Field(description="A brief, important instruction for this specific medication.")

class PrescriptionOutput(BaseModel):
    medications: List[Medication] = Field(description="A list of all the prescribed medications.")


# --- Main RAG Class ---
class RAGPrescriptionGenerator:
    def __init__(self, data_path="medical_data.json"):
        logger.info("Initializing RAG Prescription Generator...")
        self.model_name = os.getenv("OLLAMA_MODEL", "meditron:7b")
        
        if not os.path.isabs(data_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(base_dir, data_path)

        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Knowledge base file not found: {data_path}")

        self.llm = Ollama(model=self.model_name, temperature=0.1, format="json")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        self._raw_kb = self._load_data(data_path)
        self._condition_by_name = {
            item.get("condition_name", "").strip().lower(): item for item in self._raw_kb if item.get("condition_name")
        }
        
        self.vector_store = self._create_vector_store_from_items(self._raw_kb)
        # ENHANCEMENT: Increased retriever 'k' to 3 to get more context
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})

        # ENHANCEMENT: Switched to the more reliable JsonOutputParser
        self.parser = JsonOutputParser(pydantic_object=PrescriptionOutput)
        self.prompt_template = self._get_prompt_template()
        
        self.rag_chain = (
            RunnablePassthrough.assign(context=(lambda x: x["context"]))
            | self.prompt_template
            | self.llm
            | self.parser
        )
        logger.info("✅ RAG Generator initialized successfully with JSON parser.")

    def _load_data(self, data_path: str):
        logger.info(f"Loading knowledge base from {data_path}...")
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"❌ Failed to load or parse {data_path}: {e}")
            raise

    def _normalize(self, s: str) -> str:
        return s.strip().lower() if s else ""

    def _find_best_by_text(self, text: str):
        t = text.lower()
        for item in self._raw_kb:
            name = (item.get("condition_name") or "").lower()
            if name and name in t:
                return item
        for item in self._raw_kb:
            for s in item.get("symptoms", []):
                if s and s.lower() in t:
                    return item
        return None

    def _create_vector_store_from_items(self, items: List[Dict]):
        documents = []
        for item in items:
            search_content = f"Condition: {item['condition_name']}. Symptoms: {', '.join(item.get('symptoms', []))}."
            simple_metadata = {"condition_name": item.get("condition_name", "")}
            documents.append(Document(page_content=search_content, metadata=simple_metadata))
        filtered_documents = filter_complex_metadata(documents)
        logger.info(f"Creating vector store with {len(filtered_documents)} documents...")
        return Chroma.from_documents(documents=filtered_documents, embedding=self.embeddings)

    def _get_prompt_template(self) -> PromptTemplate:
        # This new prompt works with the JsonOutputParser
        template = """
        You are a precise medical data structuring tool. Based on the provided CONTEXT, generate a JSON object for the user's prescription request.
        The CONTEXT contains suggested drugs. Create a JSON object with a single key "medications" which contains a list of medication objects.
        For EACH drug in the CONTEXT's `suggested_drugs` list, create a full medication object.
        Infer logical, standard details for dosage, frequency, timing, etc., based on the drug name.
        Calculate the 'quantity' field correctly based on the frequency and duration.

        CONTEXT:
        {context}

        USER'S DESCRIPTION:
        "{question}"

        {format_instructions}
        """
        return PromptTemplate(
            template=template,
            input_variables=["context", "question"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()},
        )
        
    def _get_default_medication_details(self, drug_name: str) -> Dict:
        """Returns a dictionary of default details for a given drug name."""
        medication_defaults = {
            "Acetaminophen": {"dosage": "500mg", "frequency": "every 6 hours", "timing": "as needed for fever", "duration": "3 days", "quantity": 12, "instructions": "Do not exceed 4000mg per day."},
            "Ibuprofen": {"dosage": "400mg", "frequency": "twice daily", "timing": "with meals", "duration": "5 days", "quantity": 10, "instructions": "Take with food to prevent stomach upset."},
            "Cetirizine": {"dosage": "10mg", "frequency": "once daily", "timing": "in the evening", "duration": "7 days", "quantity": 7, "instructions": "May cause drowsiness."},
            "Loratadine": {"dosage": "10mg", "frequency": "once daily", "timing": "in the morning", "duration": "7 days", "quantity": 7, "instructions": "Non-drowsy formula."},
            "Antacid": {"dosage": "10ml", "frequency": "thrice daily", "timing": "after meals", "duration": "5 days", "quantity": 1, "instructions": "Shake well before use."},
            "Ondansetron": {"dosage": "4mg", "frequency": "twice daily", "timing": "as needed for nausea", "duration": "3 days", "quantity": 6, "instructions": "Allow to dissolve on tongue."},
            "Loperamide": {"dosage": "2mg", "frequency": "after each loose stool", "timing": "as needed", "duration": "2 days", "quantity": 8, "instructions": "Do not exceed 16mg per day."},
            "Naproxen": {"dosage": "250mg", "frequency": "twice daily", "timing": "with meals", "duration": "5 days", "quantity": 10, "instructions": "For pain and inflammation."},
            "Hydrocortisone Cream": {"dosage": "1% cream", "frequency": "twice daily", "timing": "morning and evening", "duration": "7 days", "quantity": 1, "instructions": "Apply a thin layer to the affected area."},
            "Dextromethorphan Syrup": {"dosage": "10ml", "frequency": "every 6 hours", "timing": "as needed for cough", "duration": "5 days", "quantity": 1, "instructions": "For dry, non-productive cough only."}
        }
        return medication_defaults.get(drug_name, {
            "dosage": "As directed", "frequency": "As directed", "timing": "As directed", 
            "duration": "As directed", "quantity": 1, "instructions": "Follow physician's instructions."
        })

    def generate(self, transcription: str) -> Dict:
        """
        The main function to generate a prescription from a doctor's transcription.
        This new version uses a more robust JSON parser and includes fallback logic.
        """
        logger.info(f"Generating prescription for: '{transcription}'")
        try:
            # Step 1: Retrieve matching documents from the vector store.
            retrieved_docs = self.retriever.invoke(transcription)
            if not retrieved_docs:
                logger.warning("Could not find a matching condition in the knowledge base.")
                return {"error": "Could not find a matching condition in the knowledge base."}

            # Step 2: Rehydrate the full context from our knowledge base map.
            retrieved_meta = retrieved_docs[0].metadata or {}
            condition_name = retrieved_meta.get("condition_name", "Unknown")
            full_context = self._condition_by_name.get(self._normalize(condition_name))

            # Step 3: If lookup fails, try a simple text-based fallback search.
            if not full_context:
                logger.warning(f"Vector search found '{condition_name}', but lookup failed. Trying text fallback.")
                full_context = self._find_best_by_text(transcription)
                if not full_context:
                    logger.error("Fallback search also failed. Cannot determine context.")
                    return {"error": "Could not determine the medical context from the transcription."}
                condition_name = full_context.get("condition_name", "Unknown")

            general_advice = full_context.get("general_advice", "Follow medication instructions carefully.")
            suggested_drugs = full_context.get("suggested_drugs", [])

            # Step 4: If the knowledge base has no drugs for this condition, return early.
            if not suggested_drugs:
                logger.warning(f"No medications found in knowledge base for: {condition_name}")
                return {"general_advice": general_advice, "medications": [], "condition": condition_name}

            # Step 5: Try to generate structured JSON using the enhanced RAG chain.
            medications = []
            try:
                # The chain now directly outputs a parsed dictionary, not a raw string.
                llm_response = self.rag_chain.invoke({
                    "context": full_context,
                    "question": transcription
                })
                
                if llm_response and 'medications' in llm_response:
                    medications = llm_response['medications']
                    logger.info(f"Successfully used LLM to generate {len(medications)} structured medication(s).")
                else:
                    # This helps catch cases where the LLM might return a malformed dict
                    raise ValueError("LLM response did not contain the expected 'medications' key.")

            except Exception as llm_err:
                # Step 6: If the LLM fails, fall back to the rule-based method. This makes the system robust.
                logger.warning(f"LLM enhancement failed: {llm_err}. Falling back to default medication details.")
                for drug_info in suggested_drugs:
                    drug_name = drug_info.get("name")
                    if drug_name:
                        med_details = self._get_default_medication_details(drug_name)
                        medications.append({"name": drug_name, **med_details})

            # Step 7: Construct and return the final, successful result.
            result = {
                "general_advice": general_advice,
                "medications": medications,
                "condition": condition_name
            }
            logger.info(f"✅ Generated prescription with {len(medications)} medication(s) for '{condition_name}'")
            return result

        except Exception as e:
            logger.error(f"❌ RAG pipeline failed unexpectedly: {e}", exc_info=True)
            return {"error": "A critical error occurred during prescription generation."}
