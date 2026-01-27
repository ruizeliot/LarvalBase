/**
 * Session controls for create/join/leave session functionality
 *
 * Displays:
 * - "Start Session" button when not in a session
 * - "Join Session" input + button when not in a session
 * - Session code + shareable URL + "Leave" button when in a session
 */

import { useState, useCallback } from 'react';

interface SessionControlsProps {
  /** Whether connected to Socket.IO server */
  isConnected: boolean;
  /** Current room code (null if not in session) */
  roomCode: string | null;
  /** Whether this client is the host */
  isHost: boolean;
  /** Shareable URL (host only) */
  sessionUrl: string | null;
  /** Create a new session */
  onCreateSession: () => void;
  /** Join an existing session */
  onJoinSession: (code: string) => Promise<boolean>;
  /** Leave current session */
  onLeaveSession: () => void;
}

export function SessionControls({
  isConnected,
  roomCode,
  isHost,
  sessionUrl,
  onCreateSession,
  onJoinSession,
  onLeaveSession,
}: SessionControlsProps) {
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a session code');
      return;
    }

    setJoinError(null);
    setIsJoining(true);

    const success = await onJoinSession(joinCode.trim());

    setIsJoining(false);

    if (!success) {
      setJoinError('Invalid session code or session not found');
    } else {
      setJoinCode('');
    }
  }, [joinCode, onJoinSession]);

  const handleCopyUrl = useCallback(() => {
    if (sessionUrl) {
      navigator.clipboard.writeText(sessionUrl).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    }
  }, [sessionUrl]);

  const handleCopyCode = useCallback(() => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    }
  }, [roomCode]);

  // Not connected - show warning
  if (!isConnected) {
    return (
      <div className="session-controls session-controls--disconnected">
        <span className="session-status">Connecting...</span>
      </div>
    );
  }

  // In a session - show session info
  if (roomCode) {
    return (
      <div className="session-controls session-controls--active">
        <div className="session-info">
          <span className="session-label">Session:</span>
          <button
            className="session-code"
            onClick={handleCopyCode}
            title="Click to copy code"
          >
            {roomCode}
          </button>
          {isHost && (
            <span className="session-role">(Host)</span>
          )}
        </div>

        {isHost && sessionUrl && (
          <div className="session-share">
            <input
              type="text"
              className="session-url"
              value={sessionUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className="copy-btn"
              onClick={handleCopyUrl}
              title="Copy shareable URL"
            >
              {copyFeedback ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        <button
          className="leave-btn"
          onClick={onLeaveSession}
        >
          Leave Session
        </button>
      </div>
    );
  }

  // Not in session - show create/join options
  return (
    <div className="session-controls session-controls--idle">
      <button
        className="create-btn"
        onClick={onCreateSession}
      >
        Start Session
      </button>

      <div className="session-divider">or</div>

      <div className="join-form">
        <input
          type="text"
          className="join-input"
          placeholder="Session code"
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase());
            setJoinError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleJoin();
            }
          }}
          maxLength={6}
        />
        <button
          className="join-btn"
          onClick={handleJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Joining...' : 'Join'}
        </button>
      </div>

      {joinError && (
        <div className="join-error">{joinError}</div>
      )}
    </div>
  );
}
