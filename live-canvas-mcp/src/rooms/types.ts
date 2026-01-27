/**
 * Room infrastructure types for multi-user collaboration
 *
 * These interfaces enable type-safe Socket.IO communication
 * for session management (create, join, leave) and canvas/message sync.
 */

/**
 * Syncable canvas element with version-based conflict resolution
 *
 * Based on Excalidraw's collaboration pattern:
 * - version: incremented on each edit
 * - versionNonce: random tiebreaker for same-version conflicts
 */
export interface SyncableElement {
  /** Unique element identifier */
  id: string;
  /** Version number, incremented on each edit */
  version: number;
  /** Random nonce for deterministic same-version tiebreaker */
  versionNonce: number;
  /** Whether element has been deleted (soft delete for sync) */
  isDeleted: boolean;

  // Core element properties
  /** Element type (rectangle, ellipse, arrow, text, etc.) */
  type: string;
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;

  // Visual properties
  /** Stroke/border color */
  strokeColor?: string;
  /** Background fill color */
  backgroundColor?: string;
  /** Fill style (solid, hachure, cross-hatch, etc.) */
  fillStyle?: string;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Roughness level (0 for smooth, higher for sketchy) */
  roughness?: number;
  /** Opacity (0-100) */
  opacity?: number;
  /** Rotation angle in radians */
  angle?: number;

  // Type-specific properties
  /** Points array for arrows/lines */
  points?: Array<[number, number]>;
  /** Text content for text elements */
  text?: string;
  /** Font size for text elements */
  fontSize?: number;
  /** Font family for text elements */
  fontFamily?: number;
  /** Text alignment */
  textAlign?: string;
  /** Vertical text alignment */
  verticalAlign?: string;

  // Arrow-specific properties
  /** Start element binding for arrows */
  startBinding?: { elementId: string; focus: number; gap: number } | null;
  /** End element binding for arrows */
  endBinding?: { elementId: string; focus: number; gap: number } | null;
  /** Arrow head types */
  startArrowhead?: string | null;
  /** Arrow end type */
  endArrowhead?: string | null;

  // Grouping
  /** Group IDs this element belongs to */
  groupIds?: string[];

  // Allow additional Excalidraw properties
  [key: string]: unknown;
}

/**
 * Chat message for text communication within a session
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Message text content */
  content: string;
  /** Socket ID of the message author */
  authorSocketId: string;
  /** Server timestamp when message was received (ms since epoch) */
  timestamp: number;
}

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
  /** Broadcast canvas element updates to room members (excludes sender) */
  canvas_update: (data: { elements: SyncableElement[]; fromSocketId: string }) => void;
  /** Broadcast new chat message to all room members */
  message_received: (message: ChatMessage) => void;
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
  /** Send canvas element updates to server for broadcast */
  canvas_update: (data: { roomCode: string; elements: SyncableElement[] }) => void;
  /** Send a chat message to the room */
  message_send: (data: { roomCode: string; content: string }) => void;
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
