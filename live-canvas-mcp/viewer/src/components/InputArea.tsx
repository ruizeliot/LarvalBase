import { useState, useCallback, useRef, useEffect } from 'react';
import { useWhisper } from '../hooks/useWhisper';

interface InputAreaProps {
  onSend: (
    message: string,
    options: { includeWhiteboard: boolean; includeNotes: boolean }
  ) => void;
}

export function InputArea({ onSend }: InputAreaProps) {
  const [message, setMessage] = useState('');
  const [includeWhiteboard, setIncludeWhiteboard] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    isTranscribing,
    error: whisperError,
    startRecording,
    stopRecording,
  } = useWhisper({
    onTranscription: (result) => {
      if (result.text.trim()) {
        setMessage((prev) => {
          const separator = prev.trim() ? ' ' : '';
          return prev + separator + result.text;
        });
        // Focus the textarea after transcription
        textareaRef.current?.focus();
      }
    },
    onError: (error) => {
      console.error('Whisper error:', error);
    },
  });

  // Handle push-to-talk (hold to record)
  const handleVoiceMouseDown = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleVoiceMouseUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Handle keyboard shortcut (Space to record while holding)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in textarea and holding Ctrl+Space
      if (e.code === 'Space' && e.ctrlKey && !isRecording) {
        e.preventDefault();
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.ctrlKey && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, startRecording, stopRecording]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    onSend(trimmedMessage, { includeWhiteboard, includeNotes });
    setMessage('');
  }, [message, includeWhiteboard, includeNotes, onSend]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const canSend = message.trim().length > 0 && !isRecording && !isTranscribing;

  return (
    <div className="input-area">
      <div className="input-row">
        <button
          className={`voice-button ${isRecording ? 'recording' : ''}`}
          onMouseDown={handleVoiceMouseDown}
          onMouseUp={handleVoiceMouseUp}
          onMouseLeave={isRecording ? handleVoiceMouseUp : undefined}
          title="Hold to talk (or Ctrl+Space)"
        >
          <span className="icon">{isRecording ? '🔴' : '🎤'}</span>
          <span>{isRecording ? 'Recording...' : 'Hold to Talk'}</span>
        </button>

        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder="Type your message or use voice input... (Enter to send)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={2}
        />
      </div>

      <div className="controls-row">
        <div className="include-options">
          <span>Include:</span>
          <label>
            <input
              type="checkbox"
              checked={includeWhiteboard}
              onChange={(e) => setIncludeWhiteboard(e.target.checked)}
            />
            Whiteboard
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
            />
            Notes
          </label>

          {isTranscribing && (
            <span className="transcription-status">
              ⏳ Transcribing...
            </span>
          )}

          {whisperError && (
            <span className="transcription-status error">
              ⚠️ {whisperError}
            </span>
          )}
        </div>

        <button
          className="send-button"
          onClick={handleSend}
          disabled={!canSend}
        >
          Send ▶
        </button>
      </div>
    </div>
  );
}
