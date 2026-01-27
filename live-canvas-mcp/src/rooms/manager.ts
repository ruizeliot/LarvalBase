/**
 * Room Manager for multi-user session management
 *
 * Handles the lifecycle of collaborative rooms:
 * - Room creation with unique session codes
 * - Guest joining with code validation
 * - Leave/disconnect handling with cleanup
 * - Room lookup by code or socket ID
 */

import { Room, SessionJoinResult } from "./types.js";
import { generateSessionCode, normalizeCode, isValidCodeFormat } from "./codes.js";

/**
 * Result of leaving a room
 */
export interface LeaveRoomResult {
  /** The room code that was left (null if socket wasn't in any room) */
  roomCode: string | null;
  /** Whether the leaving socket was the room host */
  wasHost: boolean;
}

/**
 * Room Manager class - tracks all active rooms and their members
 */
export class RoomManager {
  /** Map of room code -> Room */
  private rooms = new Map<string, Room>();

  /** Reverse lookup: socket ID -> room code (for efficient disconnect handling) */
  private socketToRoom = new Map<string, string>();

  /**
   * Create a new room with the given socket as host
   *
   * @param hostSocketId - Socket ID of the room creator (becomes host)
   * @param canvasState - Initial canvas state to sync to new joiners
   * @returns The created Room object
   */
  createRoom(hostSocketId: string, canvasState: unknown): Room {
    // Generate unique code (retry if collision, though extremely unlikely)
    let code = generateSessionCode();
    let attempts = 0;
    while (this.rooms.has(code) && attempts < 10) {
      code = generateSessionCode();
      attempts++;
    }

    const room: Room = {
      code,
      hostSocketId,
      guests: new Set(),
      canvasState,
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);

    console.error(`[RoomManager] Created room: ${code} (host: ${hostSocketId})`);
    return room;
  }

  /**
   * Join an existing room as a guest
   *
   * @param code - Session code to join (will be normalized)
   * @param guestSocketId - Socket ID of the joining guest
   * @returns Join result with success status and optional error
   */
  joinRoom(code: string, guestSocketId: string): SessionJoinResult {
    const normalizedCode = normalizeCode(code);

    // Validate code format first
    if (!isValidCodeFormat(normalizedCode)) {
      return {
        success: false,
        error: "Invalid session code format",
      };
    }

    // Check if room exists
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    // Check if socket is already in a room
    if (this.socketToRoom.has(guestSocketId)) {
      const existingRoom = this.socketToRoom.get(guestSocketId);
      if (existingRoom === normalizedCode) {
        // Already in this room - idempotent success
        return { success: true };
      }
      // In a different room - leave it first (or error)
      return {
        success: false,
        error: "Already in another session. Leave first.",
      };
    }

    // Add guest to room
    room.guests.add(guestSocketId);
    this.socketToRoom.set(guestSocketId, normalizedCode);

    console.error(`[RoomManager] Joined room: ${normalizedCode} (guest: ${guestSocketId})`);
    return { success: true };
  }

  /**
   * Remove a socket from its room (for leave or disconnect)
   *
   * @param socketId - Socket ID to remove
   * @returns Result indicating which room was left and if socket was host
   */
  leaveRoom(socketId: string): LeaveRoomResult {
    const roomCode = this.socketToRoom.get(socketId);

    if (!roomCode) {
      // Socket wasn't in any room
      return { roomCode: null, wasHost: false };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      // Room doesn't exist (shouldn't happen, but handle gracefully)
      this.socketToRoom.delete(socketId);
      return { roomCode, wasHost: false };
    }

    const wasHost = room.hostSocketId === socketId;

    if (wasHost) {
      // Host is leaving - delete the entire room
      // Remove all guest references first
      for (const guestId of room.guests) {
        this.socketToRoom.delete(guestId);
      }
      this.rooms.delete(roomCode);
      this.socketToRoom.delete(socketId);
      console.error(`[RoomManager] Room deleted: ${roomCode} (host left)`);
    } else {
      // Guest is leaving - just remove from guests set
      room.guests.delete(socketId);
      this.socketToRoom.delete(socketId);
      console.error(`[RoomManager] Guest left room: ${roomCode} (guest: ${socketId})`);
    }

    return { roomCode, wasHost };
  }

  /**
   * Get a room by its code
   *
   * @param code - Session code (will be normalized)
   * @returns Room if found, undefined otherwise
   */
  getRoom(code: string): Room | undefined {
    return this.rooms.get(normalizeCode(code));
  }

  /**
   * Check if a socket is the host of a room
   *
   * @param code - Session code
   * @param socketId - Socket ID to check
   * @returns true if socket is the room's host
   */
  isHost(code: string, socketId: string): boolean {
    const room = this.getRoom(code);
    return room ? room.hostSocketId === socketId : false;
  }

  /**
   * Find which room a socket is in
   *
   * @param socketId - Socket ID to look up
   * @returns Room if socket is in one, undefined otherwise
   */
  getRoomBySocketId(socketId: string): Room | undefined {
    const roomCode = this.socketToRoom.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : undefined;
  }

  /**
   * Update the canvas state for a room
   *
   * @param code - Room code
   * @param canvasState - New canvas state
   * @returns true if room was found and updated
   */
  updateCanvasState(code: string, canvasState: unknown): boolean {
    const room = this.getRoom(code);
    if (room) {
      room.canvasState = canvasState;
      return true;
    }
    return false;
  }

  /**
   * Get count of active rooms (for monitoring)
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get all socket IDs in a room (host + guests)
   *
   * @param code - Room code
   * @returns Array of socket IDs, or empty array if room not found
   */
  getRoomMembers(code: string): string[] {
    const room = this.getRoom(code);
    if (!room) return [];
    return [room.hostSocketId, ...Array.from(room.guests)];
  }
}

/**
 * Factory function to create a RoomManager instance
 *
 * @returns New RoomManager instance
 */
export function createRoomManager(): RoomManager {
  return new RoomManager();
}
