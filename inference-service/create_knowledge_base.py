import pandas as pd
import json

def clean_symptoms(row):
    """Gathers all non-empty symptoms from a row into a clean list."""
    symptoms = []
    for i in range(1, 18):
        symptom_col = f'Symptom_{i}'
        if pd.notna(row.get(symptom_col)):
            symptom = str(row[symptom_col]).strip().replace('_', ' ')
            symptoms.append(symptom)
    return symptoms

def create_knowledge_base():
    """
    Reads data from multiple CSV files, processes it, and merges it into a
    single JSON file for the RAG pipeline.
    """
    print("Starting knowledge base creation...")

    try:
        disease_symptoms_df = pd.read_csv('dataset.csv')
        symptom_precautions_df = pd.read_csv('symptom_precaution.csv')
        print("✅ CSV files loaded successfully.")
    except FileNotFoundError as e:
        print(f"❌ Error: Could not find a required CSV file. Missing file: {e.filename}")
        return

    # A fallback map for common symptoms to common over-the-counter drugs.
    # This ensures every condition with a known symptom gets at least one drug suggestion.
    symptom_drug_map = {
        "itching": {"name": "Cetirizine"}, "skin rash": {"name": "Hydrocortisone Cream"},
        "cough": {"name": "Dextromethorphan Syrup"}, "fever": {"name": "Acetaminophen"},
        "headache": {"name": "Ibuprofen"}, "acidity": {"name": "Antacid"},
        "vomiting": {"name": "Ondansetron"}, "diarrhoea": {"name": "Loperamide"},
        "joint pain": {"name": "Naproxen"}, "continuous sneezing": {"name": "Loratadine"}
    }
    
    knowledge_base = {}

    print("Processing diseases, symptoms, and mapping drugs...")
    for index, row in disease_symptoms_df.iterrows():
        disease = row['Disease']
        if disease not in knowledge_base:
            symptoms = clean_symptoms(row)
            mapped_drugs = []

            # For each symptom, check if it has a common drug mapping.
            for symptom in symptoms:
                if symptom in symptom_drug_map:
                    drug_info = symptom_drug_map[symptom]
                    # Avoid adding the same drug multiple times
                    if not any(d['name'] == drug_info['name'] for d in mapped_drugs):
                        mapped_drugs.append({"name": drug_info["name"]})
            
            knowledge_base[disease] = {
                "condition_name": disease,
                "symptoms": symptoms,
                "general_advice": "Consult a healthcare professional.",
                "suggested_drugs": mapped_drugs # Drugs are suggested based on symptoms
            }

    print("Mapping precautions to diseases...")
    for index, row in symptom_precautions_df.iterrows():
        disease = row['Disease']
        if disease in knowledge_base:
            precautions = [row[f'Precaution_{i}'] for i in range(1, 5) if pd.notna(row[f'Precaution_{i}'])]
            knowledge_base[disease]['general_advice'] = " ".join(precautions)

    final_data = list(knowledge_base.values())
    
    output_filename = 'medical_data.json'
    with open(output_filename, 'w') as f:
        json.dump(final_data, f, indent=2)
        
    print("-" * 50)
    print(f"🎉 Success! Knowledge base created as '{output_filename}'")

if __name__ == '__main__':
    create_knowledge_base()