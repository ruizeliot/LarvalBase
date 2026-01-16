"""
Whisper Transcription Server

A simple FastAPI wrapper around faster-whisper for local speech-to-text.
Supports English and French with auto-detection.

Usage:
    python server.py

API:
    POST /transcribe - Upload audio file, get transcript
    GET /health - Health check
    GET /languages - List supported languages
"""

import os
import tempfile
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Lazy load model to speed up startup
_model = None
_model_size = os.getenv("WHISPER_MODEL", "base")

def get_model():
    """Lazy load the Whisper model."""
    global _model
    if _model is None:
        print(f"Loading Whisper model: {_model_size}...")
        start = time.time()
        from faster_whisper import WhisperModel

        # Use GPU if available, otherwise CPU
        device = "cuda" if os.getenv("WHISPER_DEVICE", "auto") == "cuda" else "auto"
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "auto")

        _model = WhisperModel(
            _model_size,
            device=device,
            compute_type=compute_type
        )
        print(f"Model loaded in {time.time() - start:.2f}s")
    return _model


app = FastAPI(
    title="Whisper Transcription Server",
    description="Local speech-to-text API using faster-whisper",
    version="1.0.0"
)

# Allow CORS for browser access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported languages (ISO 639-1 codes)
SUPPORTED_LANGUAGES = {
    "en": "English",
    "fr": "French",
}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": _model_size,
        "model_loaded": _model is not None
    }


@app.get("/languages")
async def languages():
    """List supported languages."""
    return {
        "languages": SUPPORTED_LANGUAGES,
        "default": "auto"
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(..., description="Audio file (wav, mp3, webm, ogg, etc.)"),
    language: Optional[str] = Form(None, description="Language code (en, fr) or None for auto-detect")
):
    """
    Transcribe an audio file to text.

    - **file**: Audio file to transcribe
    - **language**: Optional language code (en, fr). If not provided, auto-detects.

    Returns:
    - **text**: Transcribed text
    - **language**: Detected or specified language
    - **confidence**: Average confidence score
    - **duration**: Audio duration in seconds
    """
    # Validate language if provided
    if language and language not in SUPPORTED_LANGUAGES and language != "auto":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
        )

    # Save uploaded file to temp location
    suffix = Path(file.filename).suffix if file.filename else ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model = get_model()

        # Transcribe
        # If language is None or "auto", let Whisper detect
        transcribe_language = language if language and language != "auto" else None

        segments, info = model.transcribe(
            tmp_path,
            language=transcribe_language,
            beam_size=5,
            vad_filter=True,  # Filter out silence
        )

        # Collect results
        text_parts = []
        confidences = []

        for segment in segments:
            text_parts.append(segment.text.strip())
            # Average word probabilities if available
            if hasattr(segment, 'avg_logprob'):
                # Convert log probability to confidence (0-1 scale, approximate)
                import math
                conf = math.exp(segment.avg_logprob)
                confidences.append(min(conf, 1.0))

        full_text = " ".join(text_parts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "confidence": round(avg_confidence, 3),
            "duration": round(info.duration, 2)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass


@app.on_event("startup")
async def startup_event():
    """Optionally preload the model on startup."""
    if os.getenv("WHISPER_PRELOAD", "false").lower() == "true":
        get_model()
    print(f"Whisper server ready. Model: {_model_size}")
    print(f"Languages: {', '.join(SUPPORTED_LANGUAGES.keys())}")


if __name__ == "__main__":
    host = os.getenv("WHISPER_HOST", "127.0.0.1")
    port = int(os.getenv("WHISPER_PORT", "5000"))

    print(f"Starting Whisper server on {host}:{port}")
    print(f"Model size: {_model_size}")
    print(f"API docs: http://{host}:{port}/docs")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
