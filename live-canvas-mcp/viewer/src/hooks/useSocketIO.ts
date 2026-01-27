/**
 * Socket.IO client hook for multi-user session management
 *
 * Provides session lifecycle (create/join/leave) and real-time
 * communication for collaborative brainstorming.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Session creation result from server
 */
interface SessionCreateResult {
  /** 6-character session code */
  code: string;
  /** Full URL for sharing */
  url: string;
}

/**
 * Session join result from server
 */
interface SessionJoinResult {
  /** Whether join was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Socket.IO events from server
 */
interface ServerToClientEvents {
  session_created: (data: SessionCreateResult) => void;
  user_joined: (data: { socketId: string; userName?: string }) => void;
  user_left: (data: { socketId: string }) => void;
  session_ended: (data: { reason: string; message: string }) => void;
  canvas_state: (state: unknown) => void;
}

/**
 * Socket.IO events to server
 */
interface ClientToServerEvents {
  create_session: (callback: (response: SessionCreateResult) => void) => void;
  join_session: (code: string, callback: (response: SessionJoinResult) => void) => void;
  leave_session: () => void;
}

/**
 * Generic message for backward compatibility
 */
interface SocketMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Hook options
 */
interface UseSocketIOOptions {
  /** Callback for incoming messages (for backward compat with useWebSocket) */
  onMessage?: (message: SocketMessage) => void;
  /** Callback when canvas state is received (for new joiners) */
  onCanvasState?: (state: unknown) => void;
  /** Callback when session ends */
  onSessionEnded?: (reason: string, message: string) => void;
  /** Callback when user joins */
  onUserJoined?: (socketId: string, userName?: string) => void;
  /** Callback when user leaves */
  onUserLeft?: (socketId: string) => void;
}

/**
 * Hook return type
 */
interface UseSocketIOReturn {
  /** Whether connected to server */
  isConnected: boolean;
  /** Current room code (null if not in session) */
  roomCode: string | null;
  /** Whether this client is the host */
  isHost: boolean;
  /** Shareable URL (host only) */
  sessionUrl: string | null;
  /** Create a new session */
  createSession: () => void;
  /** Join an existing session */
  joinSession: (code: string) => Promise<boolean>;
  /** Leave current session */
  leaveSession: () => void;
  /** Send a message (for backward compat) */
  send: (message: object) => void;
}

/**
 * Socket.IO hook for session management
 *
 * Usage:
 * ```tsx
 * const { isConnected, roomCode, createSession, joinSession } = useSocketIO({
 *   onCanvasState: (state) => setCanvasState(state),
 *   onSessionEnded: (reason) => alert(`Session ended: ${reason}`),
 * });
 * ```
 */
export function useSocketIO(options: UseSocketIOOptions = {}): UseSocketIOReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  // Store socket ref
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  // Keep options in ref so callbacks don't trigger reconnect
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize socket on mount
  useEffect(() => {
    // Determine Socket.IO URL (same host as page)
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const socketUrl = `${protocol}//${window.location.host}`;

    console.log('[Socket.IO] Connecting to', socketUrl);

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
      // Clear session state on disconnect
      setRoomCode(null);
      setIsHost(false);
      setSessionUrl(null);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });

    // Session events
    socket.on('user_joined', (data) => {
      console.log('[Socket.IO] User joined:', data.socketId);
      optionsRef.current.onUserJoined?.(data.socketId, data.userName);
    });

    socket.on('user_left', (data) => {
      console.log('[Socket.IO] User left:', data.socketId);
      optionsRef.current.onUserLeft?.(data.socketId);
    });

    socket.on('session_ended', (data) => {
      console.log('[Socket.IO] Session ended:', data.reason);
      setRoomCode(null);
      setIsHost(false);
      setSessionUrl(null);
      optionsRef.current.onSessionEnded?.(data.reason, data.message);
    });

    socket.on('canvas_state', (state) => {
      console.log('[Socket.IO] Received canvas state');
      optionsRef.current.onCanvasState?.(state);
    });

    // Cleanup on unmount
    return () => {
      console.log('[Socket.IO] Disconnecting');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Create a new session (becomes host)
   */
  const createSession = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.error('[Socket.IO] Cannot create session - not connected');
      return;
    }

    console.log('[Socket.IO] Creating session...');

    socket.emit('create_session', (result) => {
      console.log('[Socket.IO] Session created:', result.code);
      setRoomCode(result.code);
      setIsHost(true);
      setSessionUrl(result.url);
    });
  }, []);

  /**
   * Join an existing session by code
   */
  const joinSession = useCallback(async (code: string): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.error('[Socket.IO] Cannot join session - not connected');
      return false;
    }

    console.log('[Socket.IO] Joining session:', code);

    return new Promise((resolve) => {
      socket.emit('join_session', code.toUpperCase(), (result) => {
        if (result.success) {
          console.log('[Socket.IO] Joined session:', code);
          setRoomCode(code.toUpperCase());
          setIsHost(false);
          setSessionUrl(null);
          resolve(true);
        } else {
          console.error('[Socket.IO] Join failed:', result.error);
          resolve(false);
        }
      });
    });
  }, []);

  /**
   * Leave current session
   */
  const leaveSession = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !roomCode) {
      return;
    }

    console.log('[Socket.IO] Leaving session:', roomCode);

    socket.emit('leave_session');
    setRoomCode(null);
    setIsHost(false);
    setSessionUrl(null);
  }, [roomCode]);

  /**
   * Send a message (backward compat with useWebSocket)
   *
   * Note: For session messages, use the dedicated methods above.
   * This is for generic data broadcast (future feature).
   */
  const send = useCallback((message: object) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn('[Socket.IO] Cannot send - not connected');
      return;
    }

    // For now, this is a stub - real data sync will be implemented in Plan 03
    console.log('[Socket.IO] send() called (not yet implemented)', message);
  }, []);

  return {
    isConnected,
    roomCode,
    isHost,
    sessionUrl,
    createSession,
    joinSession,
    leaveSession,
    send,
  };
}
