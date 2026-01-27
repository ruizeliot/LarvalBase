# Phase 4: Room Infrastructure - Research

**Researched:** 2026-01-27
**Domain:** WebSocket Rooms, Session Management, Multi-User Collaboration
**Confidence:** HIGH

## Summary

Phase 4 implements the foundational room infrastructure for multi-user collaboration. The user has decided to use Socket.IO rooms (simpler for this use case) over CRDT for initial session management. This phase focuses on three requirements:
- SESS-01: Host starts session and sees shareable URL with session code
- SESS-02: Guest joins session via URL and sees same canvas state
- SESS-08: Session ends when host disconnects (guests notified)

The existing codebase uses the raw `ws` WebSocket library. Socket.IO provides built-in room management, automatic reconnection, and a well-documented TypeScript interface, making it the right choice for this simpler session-based use case where CRDT complexity is not needed.

**Primary recommendation:** Migrate from `ws` to Socket.IO, implement room manager with 6-character join codes (nanoid), and add host disconnect detection using the `disconnecting` event.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| socket.io | ^4.8.1 | WebSocket server with rooms | Built-in rooms, TypeScript support, auto-reconnect |
| socket.io-client | ^4.8.1 | Browser WebSocket client | Pairs with server, handles reconnection |
| nanoid | ^5.0.0 | Session code generation | URL-safe, 118 bytes, cryptographically secure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | ^20.10.0 | Node.js types | Already in project |
| crypto (builtin) | - | Fallback code generation | If nanoid unavailable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Socket.IO | Raw ws + custom rooms | More control but must implement rooms, reconnection manually |
| nanoid | uuid | uuid is 36 chars vs nanoid's configurable length |
| Socket.IO | Yjs/CRDT | User decision: Socket.IO simpler for Phase 4; CRDT considered for Phase 5 sync |

**Installation:**
```bash
# Server-side (live-canvas-mcp/)
npm install socket.io@^4.8.1 nanoid@^5.0.0

# Client-side (live-canvas-mcp/viewer/)
npm install socket.io-client@^4.8.1
```

## Architecture Patterns

### Recommended Project Structure
```
live-canvas-mcp/src/
├── rooms/
│   ├── manager.ts       # Room creation, join, leave, cleanup
│   ├── types.ts         # Room, Host, Guest interfaces
│   └── codes.ts         # Session code generation (nanoid)
├── server/
│   ├── http.ts          # Existing - add room join endpoint
│   ├── websocket.ts     # REPLACE with socketio.ts
│   └── socketio.ts      # NEW - Socket.IO server with rooms
└── index.ts             # Wire up Socket.IO instead of ws
```

### Pattern 1: Socket.IO with Express Integration
**What:** Attach Socket.IO to existing Express HTTP server
**When to use:** Adding real-time to existing Express app (our case)
**Example:**
```typescript
// Source: Socket.IO Official Docs (https://socket.io/docs/v4/server-initialization/)
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// Existing Express app
const app = express();
const httpServer = createServer(app);

// Add Socket.IO to same server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Room-based connection handling
io.on("connection", (socket) => {
  socket.on("join_room", (roomCode: string) => {
    socket.join(roomCode);
    io.to(roomCode).emit("user_joined", { socketId: socket.id });
  });
});

httpServer.listen(PORT);
```

### Pattern 2: Room Manager with Host Tracking
**What:** Track which socket is the host for session termination
**When to use:** Host disconnect should terminate session (SESS-08)
**Example:**
```typescript
// Source: Derived from Socket.IO Rooms docs + project requirements
interface Room {
  code: string;              // 6-char join code
  hostSocketId: string;      // Creator's socket ID
  guests: Set<string>;       // Guest socket IDs
  canvasState: object;       // Current canvas for new joins
  createdAt: number;
}

const rooms = new Map<string, Room>();

function createRoom(hostSocket: Socket): Room {
  const code = generateCode(); // nanoid
  const room: Room = {
    code,
    hostSocketId: hostSocket.id,
    guests: new Set(),
    canvasState: getCurrentCanvasState(),
    createdAt: Date.now()
  };
  rooms.set(code, room);
  hostSocket.join(code);
  return room;
}
```

### Pattern 3: Host Disconnect Detection
**What:** Use `disconnecting` event to notify guests before rooms clear
**When to use:** When host disconnects, guests need notification (SESS-08)
**Example:**
```typescript
// Source: Socket.IO Server Socket Instance docs
socket.on("disconnecting", () => {
  // socket.rooms still contains room memberships here
  for (const roomCode of socket.rooms) {
    if (roomCode === socket.id) continue; // Skip default room

    const room = rooms.get(roomCode);
    if (room && room.hostSocketId === socket.id) {
      // Host is disconnecting - notify all guests
      io.to(roomCode).emit("session_ended", {
        reason: "host_disconnected",
        message: "The session host has disconnected."
      });

      // Cleanup: disconnect all guests
      io.in(roomCode).disconnectSockets(true);
      rooms.delete(roomCode);
    }
  }
});
```

### Pattern 4: Shareable URL with Session Code
**What:** Encode session code in URL for easy sharing
**When to use:** SESS-01 requires shareable URL
**Example:**
```typescript
// Server generates join URL
function getSessionUrl(roomCode: string): string {
  const baseUrl = process.env.CANVAS_BASE_URL || `http://localhost:${PORT}`;
  return `${baseUrl}/join/${roomCode}`;
}

// Client joins via URL path
// Router: /join/:code -> extract code, emit join_room
```

### Anti-Patterns to Avoid
- **Global state for rooms:** Use room-scoped state, not modifying existing global `canvasState`
- **Polling for room status:** Use Socket.IO events, not HTTP polling
- **Trusting client-provided host status:** Server tracks host via socket ID
- **Storing full canvas history:** Only store current state for new joiners
- **Long session codes:** 6 chars is memorable; longer codes hurt UX

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Room join/leave | Custom Map with socket tracking | `socket.join(room)` / Socket.IO rooms | Automatic cleanup, broadcasting |
| Reconnection | Custom retry logic | Socket.IO auto-reconnect | Handles all edge cases |
| Session codes | `Math.random().toString(36)` | nanoid | Cryptographically secure, URL-safe |
| Broadcast to room | Loop over sockets array | `io.to(room).emit()` | O(1) lookup, no manual iteration |
| Connection timeout | Custom heartbeat | Socket.IO `pingInterval/pingTimeout` | Built-in, configurable |

**Key insight:** Socket.IO's rooms are server-side constructs with automatic cleanup. When a socket disconnects, it automatically leaves all rooms. No manual cleanup needed except for application-level state.

## Common Pitfalls

### Pitfall 1: Client Cannot Access Room List
**What goes wrong:** Attempting `socket.rooms` on client side
**Why it happens:** Rooms are server-only; clients don't know their rooms
**How to avoid:** Track room membership in client state after successful join event
**Warning signs:** Client code referencing `socket.rooms`

### Pitfall 2: Using `disconnect` Instead of `disconnecting`
**What goes wrong:** Rooms are empty in `disconnect` handler
**Why it happens:** Socket.IO clears rooms before `disconnect` fires
**How to avoid:** Use `disconnecting` event to access rooms before they clear
**Warning signs:** Empty `socket.rooms` when trying to notify room members

### Pitfall 3: Forgetting CORS Configuration
**What goes wrong:** Client fails to connect from different origin
**Why it happens:** Socket.IO requires explicit CORS config (unlike ws)
**How to avoid:** Configure `cors` option in Socket.IO server constructor
**Warning signs:** Browser console shows CORS errors

### Pitfall 4: Not Handling Room Not Found
**What goes wrong:** Guest joins with invalid code, no feedback
**Why it happens:** `socket.join()` succeeds even for non-existent "rooms"
**How to avoid:** Validate room exists in application-level `rooms` Map before joining
**Warning signs:** Users stuck waiting after entering wrong code

### Pitfall 5: Message Not Received by Sender
**What goes wrong:** `socket.to(room).emit()` excludes sender
**Why it happens:** `.to()` broadcasting excludes the emitting socket
**How to avoid:** Use `io.to(room).emit()` for all clients, or emit to sender separately
**Warning signs:** Host doesn't see their own actions reflected

## Code Examples

Verified patterns from official sources:

### Session Code Generation (nanoid)
```typescript
// Source: nanoid GitHub (https://github.com/ai/nanoid)
import { customAlphabet } from 'nanoid';

// 6-char code, alphanumeric (no confusing chars like 0/O, 1/l)
const generateCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);

// Usage
const sessionCode = generateCode(); // e.g., "ABC123"
```

### TypeScript Event Types
```typescript
// Source: Socket.IO TypeScript docs (https://socket.io/docs/v4/typescript/)
interface ServerToClientEvents {
  session_created: (data: { code: string; url: string }) => void;
  user_joined: (data: { socketId: string; userName?: string }) => void;
  user_left: (data: { socketId: string }) => void;
  session_ended: (data: { reason: string; message: string }) => void;
  canvas_state: (state: ExcalidrawState) => void;
}

interface ClientToServerEvents {
  create_session: (callback: (response: { code: string; url: string }) => void) => void;
  join_session: (code: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  leave_session: () => void;
}

interface SocketData {
  userName?: string;
  roomCode?: string;
  isHost?: boolean;
}

const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer);
```

### Complete Room Join Flow
```typescript
// Server-side handler
socket.on("join_session", (code: string, callback) => {
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    callback({ success: false, error: "Session not found" });
    return;
  }

  // Join the Socket.IO room
  socket.join(code);
  room.guests.add(socket.id);

  // Store room info on socket for disconnect handling
  socket.data.roomCode = code;
  socket.data.isHost = false;

  // Notify existing members
  socket.to(code).emit("user_joined", {
    socketId: socket.id,
    userName: socket.data.userName
  });

  // Send current canvas state to new joiner
  socket.emit("canvas_state", room.canvasState);

  callback({ success: true });
});
```

### Client-Side Connection (React Hook)
```typescript
// Source: Adapted from Socket.IO client docs
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState, useCallback } from "react";

export function useSocketIO() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("session_ended", ({ message }) => {
      alert(message);
      setRoomCode(null);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  const createSession = useCallback(() => {
    socketRef.current?.emit("create_session", (response) => {
      setRoomCode(response.code);
    });
  }, []);

  const joinSession = useCallback((code: string) => {
    socketRef.current?.emit("join_session", code, (response) => {
      if (response.success) {
        setRoomCode(code);
      } else {
        alert(response.error);
      }
    });
  }, []);

  return { isConnected, roomCode, createSession, joinSession };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ws library only | Socket.IO or ws | 2024+ | Socket.IO rooms are mature, but ws is fine for simple cases |
| Long UUID session IDs | Short memorable codes | Current | 6-char codes are shareable, URL-safe |
| HTTP polling for room | WebSocket events | Long established | Real-time updates, lower latency |

**Deprecated/outdated:**
- `socket.io@2.x`: Use v4+ for TypeScript support and modern features
- `shortid`: Deprecated, use nanoid instead

## Open Questions

Things that couldn't be fully resolved:

1. **Canvas state size for initial sync**
   - What we know: New guests receive full canvas state on join
   - What's unclear: Maximum practical size before performance issues
   - Recommendation: Implement now, optimize in Phase 5 if needed

2. **Session persistence across server restart**
   - What we know: In-memory rooms lost on restart
   - What's unclear: Whether users expect persistence
   - Recommendation: Not required for SESS-01/02/08; defer to SESS-10 (future)

3. **Concurrent session limit per host**
   - What we know: User can only be in one room at a time currently
   - What's unclear: Should host be able to run multiple sessions?
   - Recommendation: Single session per connection; revisit if requested

## Sources

### Primary (HIGH confidence)
- [Socket.IO v4 Rooms Documentation](https://socket.io/docs/v4/rooms/) - Room lifecycle, broadcasting
- [Socket.IO v4 TypeScript Guide](https://socket.io/docs/v4/typescript/) - Type definitions, event typing
- [Socket.IO Server Socket Instance](https://socket.io/docs/v4/server-socket-instance/) - Disconnect/disconnecting events
- [nanoid GitHub](https://github.com/ai/nanoid) - Secure ID generation, custom alphabets

### Secondary (MEDIUM confidence)
- [Socket.IO Server Initialization](https://socket.io/docs/v4/server-initialization/) - Express integration
- [Socket.IO Tutorial - Handling Disconnections](https://socket.io/docs/v4/tutorial/handling-disconnections) - Cleanup patterns
- [VideoSDK Socket.IO Architecture](https://www.videosdk.live/developer-hub/socketio/socket-io-architecture) - Room patterns

### Tertiary (LOW confidence)
- [Medium: Building Secured Socket Server](https://medium.com/@ahsan.aasim/building-a-secured-socket-server-with-express-and-socket-io-in-typescript-eaa8eac54889) - TypeScript setup example

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Socket.IO is well-documented, TypeScript support official
- Architecture: HIGH - Patterns derived from official docs and existing codebase analysis
- Pitfalls: HIGH - Verified via official documentation and GitHub issues

**Research date:** 2026-01-27
**Valid until:** 60 days (stable technology, no major changes expected)
