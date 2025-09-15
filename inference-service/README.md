# Medical Transcription Inference Service

This service provides AI-powered medical transcription using a fine-tuned Whisper model. It's designed to transcribe medical audio recordings into text with high accuracy for prescription instructions and medical notes.

## Features

- **Fine-tuned Whisper Model**: Uses a custom-trained Whisper model optimized for medical terminology
- **Multiple Audio Formats**: Supports WAV, MP3, WEBM, M4A, and FLAC formats
- **Real-time Processing**: Fast transcription with optimized inference parameters
- **Error Handling**: Robust error handling with detailed error messages
- **Health Monitoring**: Built-in health check endpoint for service monitoring
- **CORS Support**: Configured for cross-origin requests from the web application

## Prerequisites

- Python 3.8 or higher
- CUDA-compatible GPU (recommended) or CPU
- Fine-tuned Whisper model checkpoint

## Installation

1. **Navigate to the inference service directory:**
   ```bash
   cd inference-service
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Update model path:**
   Edit `inference_service.py` and update the `MODEL_DIR` variable with your actual model path:
   ```python
   MODEL_DIR = r"path\to\your\whisper-model\checkpoint"
   ```

## Usage

### Starting the Service

**Option 1: Using the startup script (recommended):**
```bash
python start_service.py
```

**Option 2: Direct uvicorn command:**
```bash
uvicorn inference_service:app --host 0.0.0.0 --port 8001 --reload
```

The service will be available at:
- **API Base URL**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

### API Endpoints

#### Health Check
```http
GET /health
```
Returns service status and model information.

#### Transcription
```http
POST /transcribe
Content-Type: multipart/form-data

Form data:
- audio: Audio file (WAV, MP3, WEBM, M4A, FLAC)
```

**Response:**
```json
{
  "transcription": "Take two tablets twice daily with food",
  "confidence": "high",
  "language": "english",
  "duration": 3.5
}
```

### Testing the Service

Run the test script to verify the service is working:
```bash
python test_transcription.py
```

## Integration with Doctor Dashboard

The service is integrated with the doctor dashboard through the following flow:

1. **Doctor Dashboard** → Records audio using browser MediaRecorder API
2. **Node.js Server** → Receives audio file and forwards to inference service
3. **Inference Service** → Processes audio with fine-tuned Whisper model
4. **Response** → Returns transcription back to dashboard

### Configuration

The service is configured to:
- Accept CORS requests from `http://localhost:3000`, `http://localhost:3001`, and `http://localhost:5000`
- Use English language transcription
- Process audio in mono format
- Handle various audio formats automatically

## Model Information

- **Base Model**: OpenAI Whisper Small
- **Fine-tuning**: Custom medical dataset
- **Checkpoint**: checkpoint-310
- **Language**: English
- **Task**: Transcribe (medical terminology)

## Troubleshooting

### Common Issues

1. **Model not found error:**
   - Verify the `MODEL_DIR` path in `inference_service.py`
   - Ensure the model checkpoint files exist

2. **CUDA out of memory:**
   - The model will automatically fall back to CPU
   - Consider using a smaller batch size or shorter audio clips

3. **Audio format not supported:**
   - The service supports most common audio formats
   - Try converting to WAV format if issues persist

4. **Service not responding:**
   - Check if the service is running on port 8001
   - Verify firewall settings
   - Check the console for error messages

### Performance Tips

- **GPU Usage**: Ensure CUDA is properly installed for faster inference
- **Audio Quality**: Use clear, noise-free audio for better transcription accuracy
- **Audio Length**: Shorter audio clips (under 30 seconds) process faster
- **Batch Processing**: For multiple files, consider implementing batch processing

## Development

### Adding New Features

1. **New Audio Formats**: Add format support in the audio loading section
2. **Confidence Scores**: Implement actual confidence scoring from the model
3. **Batch Processing**: Add endpoint for processing multiple audio files
4. **Language Support**: Extend to support multiple languages

### Monitoring

The service includes logging for:
- Audio file processing
- Model inference times
- Error conditions
- Request/response details

Check the console output for detailed logs during operation.

## Security Considerations

- The service runs on localhost by default
- For production deployment, implement proper authentication
- Consider rate limiting for API endpoints
- Validate audio file sizes and formats

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify the model path and dependencies
3. Test with the provided test script
4. Ensure the service is accessible from the Node.js server
