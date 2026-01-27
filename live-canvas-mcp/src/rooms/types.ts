/**
 * Room infrastructure types for multi-user collaboration
 *
 * These interfaces enable type-safe Socket.IO communication
 * for session management (create, join, leave).
 */

/**
 * Represents a collaborative session room
 */
export interface Room {
  /** 6-character session code (uppercase alphanumeric) */
  code: string;
  /** Socket ID of the session host */
  hostSocketId: string;
  /** Set of guest socket IDs */
  guests: Set<string>;
  /** Current canvas state for new joiners */
  canvasState: unknown;
  /** Room creation timestamp (ms since epoch) */
  createdAt: number;
}

/**
 * Result returned when creating a new session
 */
export interface SessionCreateResult {
  /** The 6-character session code */
  code: string;
  /** Full URL for sharing (e.g., http://localhost:3001/join/ABC123) */
  url: string;
}

/**
 * Result returned when attempting to join a session
 */
export interface SessionJoinResult {
  /** Whether the join was successful */
  success: boolean;
  /** Error message if join failed */
  error?: string;
}

/**
 * Events emitted from server to connected clients
 */
export interface ServerToClientEvents {
  /** Sent to host after session creation */
  session_created: (data: SessionCreateResult) => void;
  /** Broadcast when a new user joins the session */
  user_joined: (data: { socketId: string; userName?: string }) => void;
  /** Broadcast when a user leaves the session */
  user_left: (data: { socketId: string }) => void;
  /** Broadcast when the session ends (host disconnected) */
  session_ended: (data: { reason: string; message: string }) => void;
  /** Sent to new joiners with current canvas state */
  canvas_state: (state: unknown) => void;
}

/**
 * Events emitted from clients to server
 */
export interface ClientToServerEvents {
  /** Request to create a new session */
  create_session: (callback: (response: SessionCreateResult) => void) => void;
  /** Request to join an existing session */
  join_session: (code: string, callback: (response: SessionJoinResult) => void) => void;
  /** Request to leave the current session */
  leave_session: () => void;
}

/**
 * Inter-server events (not used currently, but required by Socket.IO types)
 */
export interface InterServerEvents {
  // Reserved for future cluster support
}

/**
 * Data attached to each socket instance
 */
export interface SocketData {
  /** User's display name (optional) */
  userName?: string;
  /** Room code the socket is in (if any) */
  roomCode?: string;
  /** Whether this socket is the room host */
  isHost?: boolean;
}
