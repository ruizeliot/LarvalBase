---
phase: 04
plan: 01
subsystem: rooms
tags: [socket.io, websocket, rooms, session-management, nanoid]

depends:
  requires: []
  provides:
    - Room types (Room, SessionJoinResult, SessionCreateResult)
    - Session code generation (6-char alphanumeric)
    - RoomManager for room lifecycle
    - Socket.IO server module (not yet wired)
  affects:
    - 04-02 (will wire Socket.IO into index.ts)
    - 04-03 (client-side will use these events)
    - 05-* (canvas sync will use room infrastructure)

tech-stack:
  added:
    - socket.io@4.8.3
    - nanoid@5.1.6
  patterns:
    - Socket.IO rooms for multi-user sessions
    - nanoid customAlphabet for memorable codes
    - TypeScript event interfaces for type-safe Socket.IO
    - Module-level singleton for RoomManager

key-files:
  created:
    - live-canvas-mcp/src/rooms/types.ts
    - live-canvas-mcp/src/rooms/codes.ts
    - live-canvas-mcp/src/rooms/manager.ts
    - live-canvas-mcp/src/server/socketio.ts
  modified:
    - live-canvas-mcp/package.json

decisions:
  - id: D04-01-01
    title: "6-char session codes with safe alphabet"
    choice: "Use nanoid customAlphabet excluding 0/O, 1/l, I"
    why: "Codes are easy to read aloud and type; no visual ambiguity"
  - id: D04-01-02
    title: "Module-level RoomManager singleton"
    choice: "Single createRoomManager() in socketio.ts module scope"
    why: "Simple state management; no need for DI complexity yet"
  - id: D04-01-03
    title: "Host disconnect ends session"
    choice: "Use 'disconnecting' event to emit session_ended before room clears"
    why: "SESS-08 requirement; guests need notification before being kicked"

metrics:
  duration: ~20min
  completed: 2026-01-27
---

# Phase 04 Plan 01: Room Infrastructure Server

**One-liner:** Socket.IO server with room manager, session codes, and typed events for multi-user collaboration

## What Was Built

### Room Types (`src/rooms/types.ts`)
- `Room` interface: code, hostSocketId, guests (Set), canvasState, createdAt
- `SessionCreateResult`: code + URL for sharing
- `SessionJoinResult`: success/error response
- `ServerToClientEvents`: session_created, user_joined, user_left, session_ended, canvas_state
- `ClientToServerEvents`: create_session, join_session, leave_session
- `SocketData`: per-socket userName, roomCode, isHost

### Session Codes (`src/rooms/codes.ts`)
- `generateSessionCode()`: 6-char codes using nanoid
- Custom alphabet: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (no confusing chars)
- `normalizeCode()`: uppercase + trim for comparison
- `isValidCodeFormat()`: input validation

### Room Manager (`src/rooms/manager.ts`)
- `RoomManager` class with Map-based storage
- `createRoom(hostSocketId, canvasState)`: generates unique code, tracks host
- `joinRoom(code, guestSocketId)`: validates code, adds to guests Set
- `leaveRoom(socketId)`: removes socket, cleans up if host leaves
- Reverse lookup map: socketId -> roomCode for O(1) disconnect handling
- Helper methods: getRoom, isHost, getRoomBySocketId, updateCanvasState

### Socket.IO Server (`src/server/socketio.ts`)
- `initSocketIO(httpServer, getCanvasState, port)`: initializes server
- CORS configured for local network (`origin: "*"`)
- Typed with full event interfaces

**Event Handlers:**
- `create_session`: creates room, joins Socket.IO room, returns {code, url}
- `join_session`: validates, adds to room, emits user_joined, sends canvas_state
- `leave_session`: explicit leave handling
- `disconnecting`: host detection before rooms clear

**Host Disconnect (SESS-08):**
- Emits `session_ended` to all members
- Forces sockets to leave Socket.IO room
- RoomManager cleans up storage

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 457e4ca | feat | Install Socket.IO dependencies and create room types |
| 8bf64ab | feat | Create session code generator and room manager |
| ededa60 | feat | Create Socket.IO server with room event handlers |

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies Verified

| Package | Version | Purpose |
|---------|---------|---------|
| socket.io | 4.8.3 | WebSocket server with rooms |
| nanoid | 5.1.6 | Session code generation |

## Key Links Verified

| From | To | Via |
|------|-----|-----|
| manager.ts | codes.ts | `import { generateSessionCode } from "./codes.js"` |
| socketio.ts | manager.ts | `roomManager.createRoom/joinRoom/leaveRoom` calls |
| socketio.ts | types.ts | All event interfaces imported |

## What's NOT Done (Plan 02)

- Socket.IO not wired into index.ts yet
- No HTTP endpoint for /join/:code route
- No client-side Socket.IO integration

## Next Phase Readiness

**Ready for Plan 02:** Wire Socket.IO into existing server

**Blockers:** None

**Concerns:** None - clean standalone implementation
