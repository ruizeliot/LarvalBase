# BUG-20260127-whisper-webm-decode

**Status:** Fixed
**Date:** 2026-01-27
**Commit:** af78c1c

## User Story

> As a user, I expect voice transcription to work when I use the speech-to-text feature,
> but the Whisper server was returning 500 Internal Server Error for browser-recorded audio.

## Acceptance Criteria

- [x] The `/transcribe` endpoint returns successful transcription results (200 OK)
- [x] No "Whisper error: Transcription failed" messages in console

## Root Cause

faster-whisper's default audio decoding uses PyAV, which fails to properly decode browser-recorded WebM files (audio/webm;codecs=opus from MediaRecorder). PyAV has stricter parsing than FFmpeg and throws "End of file" errors on these files.

Error message: `Transcription failed: [Errno 541478725] End of file`

## Solution

Pre-decode the audio file using `faster_whisper.audio.decode_audio()` before passing to `model.transcribe()`. This function uses FFmpeg directly and handles incomplete/browser-recorded webm files more robustly.

```python
# Before (broken)
segments, info = model.transcribe(tmp_path, ...)

# After (fixed)
from faster_whisper.audio import decode_audio
audio_array = decode_audio(tmp_path, sampling_rate=16000)
segments, info = model.transcribe(audio_array, ...)
```

## Test Coverage

| Test Type | File | Description |
|-----------|------|-------------|
| Manual | N/A | Record voice in Live Canvas browser, verify transcription works |

## Files Changed

- `whisper-server/server.py` - Use decode_audio() to pre-decode audio before transcription

## Verification

- [x] Automated tests pass (N/A - no automated tests for this component)
- [x] User manually verified fix works

## References

- [faster-whisper issue #988: PyAV vs ffmpeg decode behavior](https://github.com/SYSTRAN/faster-whisper/issues/988)

---

*This bug fix is documented to prevent regression and maintain project knowledge.*
