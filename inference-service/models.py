from transformers import WhisperProcessor, WhisperForConditionalGeneration
from sentence_transformers import SentenceTransformer

print('Downloading Whisper Small...')
WhisperProcessor.from_pretrained('openai/whisper-small')
WhisperForConditionalGeneration.from_pretrained('openai/whisper-medium')

# print('Downloading sentence transformer...')
# SentenceTransformer('all-MiniLM-L6-v2')

print('✅ Models ready!')