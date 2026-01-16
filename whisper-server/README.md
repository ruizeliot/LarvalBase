# Whisper Transcription Server

Local speech-to-text API using [faster-whisper](https://github.com/SYSTRAN/faster-whisper).

## Features

- **Fast**: Uses CTranslate2 optimized inference
- **Multi-language**: English + French (auto-detect or specify)
- **Simple API**: Single `/transcribe` endpoint
- **Privacy**: All processing is local

## Quick Start

```powershell
# Start the server
.\start-whisper.ps1

# Or with options
.\start-whisper.ps1 -Model small -Port 5001
```

## API

### POST /transcribe

Upload an audio file and get the transcript.

**Request:**
```bash
curl -X POST "http://localhost:5000/transcribe" \
  -F "file=@audio.wav" \
  -F "language=en"  # Optional: en, fr, or omit for auto-detect
```

**Response:**
```json
{
  "text": "Hello, this is a test.",
  "language": "en",
  "language_probability": 0.98,
  "confidence": 0.92,
  "duration": 3.5
}
```

### GET /health

Health check.

```bash
curl http://localhost:5000/health
```

### GET /languages

List supported languages.

```bash
curl http://localhost:5000/languages
```

## Model Sizes

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| `tiny` | 75 MB | Fastest | Basic |
| `base` | 142 MB | Fast | Good (default) |
| `small` | 466 MB | Medium | Better |
| `medium` | 1.5 GB | Slow | Great |
| `large-v2` | 3 GB | Slowest | Best |
| `large-v3` | 3 GB | Slowest | Best |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `base` | Model size |
| `WHISPER_PORT` | `5000` | Server port |
| `WHISPER_HOST` | `127.0.0.1` | Bind address |
| `WHISPER_PRELOAD` | `false` | Load model on startup |
| `WHISPER_DEVICE` | `auto` | `cuda` or `cpu` |
| `WHISPER_COMPUTE_TYPE` | `auto` | `float16`, `int8`, etc. |

## Supported Audio Formats

- WAV
- MP3
- WebM
- OGG
- FLAC
- M4A
- And more (anything FFmpeg supports)

## GPU Acceleration

For NVIDIA GPU support, install PyTorch with CUDA:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

## Integration with Live Canvas

The Live Canvas browser app sends audio to this server via:

```javascript
const formData = new FormData();
formData.append('file', audioBlob, 'recording.webm');

const response = await fetch('http://localhost:5000/transcribe', {
  method: 'POST',
  body: formData
});

const { text, language } = await response.json();
```

## Troubleshooting

### "Model not found"
First run downloads the model. Ensure internet connection.

### Slow transcription
Use a smaller model (`tiny` or `base`) or enable GPU.

### Out of memory
Use a smaller model or set `WHISPER_COMPUTE_TYPE=int8`.
