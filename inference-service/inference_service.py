import os
import tempfile
import torch
import soundfile as sf
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import uvicorn

# ====== MODEL LOADING ======
MODEL_DIR = r"C:\\Users\\SHRINIVAS\\Music\\ai-training\\whisper-small-finetuned\\checkpoint-310"

processor = WhisperProcessor.from_pretrained("openai/whisper-small")
model = WhisperForConditionalGeneration.from_pretrained(MODEL_DIR)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)

# ====== FASTAPI APP ======
app = FastAPI()

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Save temp file
    suffix = os.path.splitext(audio.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        # Load audio
        speech, sr = sf.read(tmp_path)

        # Whisper inference (force English transcription)
        inputs = processor(speech, sampling_rate=sr, return_tensors="pt").input_features.to(device)
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="english", task="transcribe")
        predicted_ids = model.generate(inputs, forced_decoder_ids=forced_decoder_ids)
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        os.remove(tmp_path)

    return {"transcription": transcription}


if __name__ == "__main__":
    uvicorn.run("inference_service:app", host="0.0.0.0", port=8001, reload=False)
