/**
 * Socket.IO server for multi-user room collaboration
 *
 * Provides real-time communication for:
 * - Session creation (host creates room, gets shareable URL)
 * - Session joining (guest joins with code)
 * - Session leaving (explicit or disconnect)
 * - Host disconnect detection (ends session for all)
 *
 * IMPORTANT: This module stands alone - wiring into index.ts is Plan 02's job.
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { nanoid } from "nanoid";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  SyncableElement,
  ChatMessage,
} from "../rooms/types.js";
import { createRoomManager, RoomManager } from "../rooms/manager.js";
import { mergeElements } from "../sync/merge.js";

/**
 * Default port for URL generation (can be overridden)
 */
const DEFAULT_PORT = 3001;

/**
 * Module-level Socket.IO server instance
 */
let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

/**
 * Module-level RoomManager instance
 */
const roomManager: RoomManager = createRoomManager();

/**
 * Initialize Socket.IO server and attach to HTTP server
 *
 * @param httpServer - HTTP server to attach Socket.IO to
 * @param getCanvasState - Function to get current canvas state for new rooms
 * @param port - Port number for URL generation (default: 3001)
 */
export function initSocketIO(
  httpServer: HttpServer,
  getCanvasState: () => unknown,
  port: number = DEFAULT_PORT
): void {
  // Create Socket.IO server with CORS config for development
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: "*", // Allow all origins for local network access
      methods: ["GET", "POST"],
    },
  });

  console.error(`[Socket.IO] Server initialized`);

  // Handle new connections
  io.on("connection", (socket) => {
    console.error(`[Socket.IO] Client connected: ${socket.id}`);

    // ==================== CREATE SESSION ====================
    socket.on("create_session", (callback) => {
      // Get current canvas state for new joiners
      const canvasState = getCanvasState();

      // Create the room
      const room = roomManager.createRoom(socket.id, canvasState);

      // Join the Socket.IO room
      socket.join(room.code);

      // Store room info on socket for disconnect handling
      socket.data.roomCode = room.code;
      socket.data.isHost = true;

      // Generate shareable URL
      const url = `http://localhost:${port}/join/${room.code}`;

      console.error(`[Room] Created: ${room.code} by ${socket.id}`);

      // Return result to client
      callback({ code: room.code, url });
    });

    // ==================== JOIN SESSION ====================
    socket.on("join_session", (code, callback) => {
      // Attempt to join the room
      const result = roomManager.joinRoom(code, socket.id);

      if (!result.success) {
        console.error(`[Room] Join failed: ${code} - ${result.error}`);
        callback(result);
        return;
      }

      // Join successful - get the room
      const room = roomManager.getRoom(code);
      if (!room) {
        // Shouldn't happen if joinRoom succeeded, but handle gracefully
        callback({ success: false, error: "Room disappeared unexpectedly" });
        return;
      }

      // Join the Socket.IO room
      socket.join(room.code);

      // Store room info on socket
      socket.data.roomCode = room.code;
      socket.data.isHost = false;

      // Notify existing room members
      socket.to(room.code).emit("user_joined", {
        socketId: socket.id,
        userName: socket.data.userName,
      });

      // Send current canvas state to the new joiner
      socket.emit("canvas_state", room.canvasState);

      console.error(`[Room] Joined: ${room.code} by ${socket.id}`);

      // Return success
      callback({ success: true });
    });

    // ==================== LEAVE SESSION ====================
    socket.on("leave_session", () => {
      handleLeave(socket);
    });

    // ==================== CANVAS UPDATE ====================
    socket.on("canvas_update", (data) => {
      // Security check: validate socket is in the claimed room
      if (socket.data.roomCode !== data.roomCode) {
        console.error(
          `[Room] Canvas update rejected: socket ${socket.id} not in room ${data.roomCode}`
        );
        return;
      }

      const room = roomManager.getRoom(data.roomCode);
      if (!room) {
        console.error(`[Room] Canvas update rejected: room ${data.roomCode} not found`);
        return;
      }

      // Merge incoming elements with current room state
      const currentState = (room.canvasState as SyncableElement[]) || [];
      const mergedState = mergeElements(currentState, data.elements);

      // Update room canvas state
      roomManager.updateCanvasState(data.roomCode, mergedState);

      // Broadcast to OTHER room members (socket.to excludes sender)
      socket.to(data.roomCode).emit("canvas_update", {
        elements: data.elements,
        fromSocketId: socket.id,
      });

      console.error(
        `[Room] Canvas update: ${data.roomCode} - ${data.elements.length} elements`
      );
    });

    // ==================== MESSAGE SEND ====================
    socket.on("message_send", (data) => {
      // Security check: validate socket is in the claimed room
      if (socket.data.roomCode !== data.roomCode) {
        console.error(
          `[Room] Message rejected: socket ${socket.id} not in room ${data.roomCode}`
        );
        return;
      }

      const room = roomManager.getRoom(data.roomCode);
      if (!room) {
        console.error(`[Room] Message rejected: room ${data.roomCode} not found`);
        return;
      }

      // Create message with server timestamp
      const message: ChatMessage = {
        id: nanoid(),
        content: data.content,
        authorSocketId: socket.id,
        timestamp: Date.now(),
      };

      // Broadcast to ALL room members (io.to includes sender for confirmation)
      if (io) {
        io.to(data.roomCode).emit("message_received", message);
      }

      console.error(
        `[Room] Message: ${data.roomCode} - ${data.content.substring(0, 50)}${
          data.content.length > 50 ? "..." : ""
        }`
      );
    });

    // ==================== DISCONNECT HANDLING ====================
    // Use 'disconnecting' event to access rooms before they're cleared
    socket.on("disconnecting", () => {
      console.error(`[Socket.IO] Client disconnecting: ${socket.id}`);
      handleLeave(socket, true);
    });

    socket.on("disconnect", (reason) => {
      console.error(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  /**
   * Handle socket leaving a room (explicit leave or disconnect)
   */
  function handleLeave(
    socket: SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >["sockets"]["sockets"] extends Map<string, infer S> ? S : never,
    isDisconnecting = false
  ): void {
    const roomCode = socket.data.roomCode;

    if (!roomCode) {
      // Socket wasn't in any room
      return;
    }

    // Leave the room via room manager
    const { wasHost } = roomManager.leaveRoom(socket.id);

    if (wasHost && io) {
      // Host left - notify all remaining members that session ended
      io.to(roomCode).emit("session_ended", {
        reason: "host_disconnected",
        message: "The session host has disconnected.",
      });

      // Force disconnect all remaining sockets in the room
      // (They're notified above, this cleans up the Socket.IO room)
      io.in(roomCode).socketsLeave(roomCode);

      console.error(`[Room] Session ended: ${roomCode} (host left)`);
    } else if (!wasHost && io) {
      // Guest left - notify room
      io.to(roomCode).emit("user_left", { socketId: socket.id });
    }

    // Leave Socket.IO room (if not already handled by disconnect)
    if (!isDisconnecting) {
      socket.leave(roomCode);
    }

    // Clear socket data
    socket.data.roomCode = undefined;
    socket.data.isHost = undefined;
  }
}

/**
 * Get the Socket.IO server instance
 *
 * @returns Socket.IO server or null if not initialized
 */
export function getIO(): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null {
  return io;
}

/**
 * Get the RoomManager instance
 *
 * @returns The module's RoomManager
 */
export function getRoomManager(): RoomManager {
  return roomManager;
}
