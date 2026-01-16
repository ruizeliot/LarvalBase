import { useState, useCallback, useRef } from 'react';

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  duration: number;
}

interface UseWhisperOptions {
  whisperUrl?: string;
  onTranscription?: (result: TranscriptionResult) => void;
  onError?: (error: string) => void;
}

export function useWhisper(options: UseWhisperOptions = {}) {
  const {
    whisperUrl = 'http://localhost:5000',
    onTranscription,
    onError
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm format (works well with Whisper)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(message);
      onError?.(message);
    }
  }, [onError]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    return new Promise<TranscriptionResult | null>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsRecording(false);

        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (audioBlob.size === 0) {
          resolve(null);
          return;
        }

        // Send to Whisper server
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const response = await fetch(`${whisperUrl}/transcribe`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
          }

          const result: TranscriptionResult = await response.json();
          onTranscription?.(result);
          resolve(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Transcription failed';
          setError(message);
          onError?.(message);
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.stop();
    });
  }, [whisperUrl, onTranscription, onError]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
