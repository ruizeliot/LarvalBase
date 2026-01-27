# Technology Stack: Multi-User Collaboration Milestone

**Project:** AI Visual Brainstorming Assistant - Multi-User Extension
**Researched:** 2026-01-27
**Milestone:** Adding multi-user collaboration, voice input, and document handling

---

## Executive Summary

This stack research focuses on **additions** to the existing Live Canvas MCP system. The existing stack (React 18, Vite, Excalidraw, WebSocket via `ws`, Zustand, TypeScript) remains unchanged. This document recommends specific libraries for:

1. **Voice transcription** - OpenAI Whisper API (not self-hosted)
2. **Multi-user sync** - Socket.IO rooms (extend existing WebSocket)
3. **Document handling** - react-dropzone + local filesystem storage

**Key decision:** Use Socket.IO rooms instead of Yjs/CRDT for multi-user sync because the existing single-user WebSocket sync already handles canvas state. We need session/room management, not conflict resolution.

---

## Existing Stack (DO NOT CHANGE)

| Component | Current | Version | Status |
|-----------|---------|---------|--------|
| Frontend Framework | React | ^18.2.0 | Keep |
| Build Tool | Vite | ^5.0.0 | Keep |
| Canvas | Excalidraw | ^0.17.0 | Keep |
| State Management | Zustand | ^4.5.0 | Keep |
| WebSocket (Server) | ws | ^8.16.0 | Extend |
| MCP Server | @modelcontextprotocol/sdk | ^1.0.0 | Keep |
| Language | TypeScript | ^5.3.0 | Keep |

---

## New Stack Additions

### 1. Voice Transcription: OpenAI Whisper API

**Recommendation:** Use OpenAI Whisper API, not self-hosted Whisper.

| Technology | Version | Purpose |
|------------|---------|---------|
| OpenAI Whisper API | whisper-1 | Speech-to-text transcription |
| MediaRecorder API | Browser native | Audio capture (push-to-talk) |

**Why Whisper API over self-hosted:**

| Factor | API | Self-Hosted |
|--------|-----|-------------|
| Cost | $0.006/min (~$0.36/hr) | $276+/month GPU infrastructure |
| Setup | API key only | GPU provisioning, model deployment |
| Latency | 4-7 seconds per request | 380-520ms (but needs infrastructure) |
| EN/FR detection | Built-in, near-100% accurate | Same model, but you manage it |
| Maintenance | Zero | Model updates, scaling, monitoring |

**For a brainstorming app with occasional voice input, API is clearly better.** Self-hosting only makes sense at 3,000+ hours/month of transcription.

**Language auto-detection:** Whisper achieves 2.7% Word Error Rate on English and maintains 3-8% WER on French. Auto-detection uses the first 30 seconds of audio and is near-100% accurate for English/French.

**Browser audio format:** MediaRecorder produces WebM/Opus format (`audio/webm;codecs=opus`), which is directly accepted by Whisper API - no conversion needed.

**Confidence:** HIGH
- Source: [OpenAI Speech-to-Text Docs](https://platform.openai.com/docs/guides/speech-to-text)
- Source: [Whisper API Pricing Analysis](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)
- Source: [Whisper Language Support](https://github.com/openai/whisper)

### 2. Multi-User Sync: Socket.IO Rooms

**Recommendation:** Socket.IO for session/room management. NOT Yjs.

| Technology | Version | Purpose |
|------------|---------|---------|
| socket.io | ^4.8.3 | Server-side WebSocket with rooms |
| socket.io-client | ^4.8.1 | Client-side WebSocket |

**Why Socket.IO rooms over Yjs/CRDT:**

| Factor | Socket.IO Rooms | Yjs CRDT |
|--------|-----------------|----------|
| What it solves | Session management, user presence | Conflict-free merging |
| Existing WebSocket | Integrates easily | Requires rewrite |
| Complexity | Low - just add rooms | High - new mental model |
| Overkill? | No - matches our need | Yes - we already have sync |

**The key insight:** The existing Live Canvas MCP already broadcasts canvas updates via WebSocket. Multi-user means:
1. **Session rooms** - Multiple users join the same "room"
2. **User presence** - Who's online, cursor positions
3. **Message routing** - Broadcast to room, not to all

Socket.IO provides exactly these features with minimal code changes. Yjs would replace the existing sync mechanism entirely - unnecessary work.

**Socket.IO room features we'll use:**
- `socket.join(roomId)` - User joins a session
- `io.to(roomId).emit(event, data)` - Broadcast to room only
- Built-in reconnection and error handling
- Cross-tab communication support

**Confidence:** HIGH
- Source: [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/)
- Source: [Socket.IO npm](https://www.npmjs.com/package/socket.io)

### 3. Document/Image Gallery: react-dropzone + Local Storage

**Recommendation:** react-dropzone for upload UI, local filesystem for storage.

| Technology | Version | Purpose |
|------------|---------|---------|
| react-dropzone | ^14.3.8 | Drag-drop file upload UI |
| (built-in) fs | Node.js native | Server-side file storage |

**Why react-dropzone:**
- Simple hook-based API (`useDropzone`)
- TypeScript support
- Works with existing Vite/React setup
- 4,400+ projects use it
- No file upload backend required - just delivers File objects

**Why local filesystem over cloud storage:**
- This is a local-first brainstorming tool
- Files are session-scoped, not permanent
- No need for CDN/cloud complexity
- Existing MCP server already writes to filesystem (brainstorm-notes.md)

**Storage pattern:**
```
.planning/
├── sessions/
│   └── {sessionId}/
│       ├── documents/
│       │   ├── image1.png
│       │   └── doc1.pdf
│       └── session-state.json
```

**Supported file types:**
- Images: PNG, JPG, GIF, WebP (for canvas/visual reference)
- Documents: PDF, TXT, MD (for context upload)
- Size limit: 10MB per file (reasonable for brainstorming materials)

**Confidence:** HIGH
- Source: [react-dropzone Documentation](https://react-dropzone.js.org/)
- Source: [react-dropzone npm](https://www.npmjs.com/package/react-dropzone)

---

## Installation Commands

```bash
# Server-side (MCP server)
npm install socket.io@^4.8.3

# Client-side (viewer)
npm install socket.io-client@^4.8.1 react-dropzone@^14.3.8
```

**No additional dependencies for:**
- Whisper API - Use native `fetch()` with OpenAI endpoint
- MediaRecorder - Browser native API
- File storage - Node.js native `fs`

---

## Integration Architecture

### Voice Input Flow

```
[Browser: Push-to-Talk Button]
         │
         ▼
[MediaRecorder: Start/Stop]
         │
         ▼
[WebM/Opus Audio Blob]
         │
         ▼
[Socket.IO: Send to Server]
         │
         ▼
[MCP Server: Relay to OpenAI]
         │
         ▼
[Whisper API: Transcribe]
         │
         ▼
[Response: Text + Detected Language]
         │
         ▼
[Socket.IO: Broadcast to Room]
         │
         ▼
[All Clients: Display Transcription]
```

### Multi-User Session Flow

```
[Host: Start Session]
         │
         ▼
[Server: Generate sessionId]
         │
         ▼
[Host: Share URL with sessionId]
         │
[Guest 1: Connect]    [Guest 2: Connect]
         │                    │
         ▼                    ▼
[Socket.IO: Join Room]  [Socket.IO: Join Room]
         │                    │
         └────────┬───────────┘
                  ▼
[Room: All connected, presence synced]
                  │
                  ▼
[Canvas/Voice/Docs: Broadcast to room]
```

### Document Gallery Flow

```
[react-dropzone: File Selected]
         │
         ▼
[Client: Preview + Upload via Socket.IO]
         │
         ▼
[Server: Save to .planning/sessions/{id}/documents/]
         │
         ▼
[Server: Broadcast file metadata to room]
         │
         ▼
[All Clients: Update gallery UI]
         │
[User: Drag from Gallery]
         │
         ▼
[AI Message: Include file reference]
```

---

## What NOT to Add

| Technology | Why NOT |
|------------|---------|
| **Yjs / CRDT** | Overkill - existing WebSocket sync works, we just need rooms |
| **Whisper self-hosted** | Cost/complexity not justified for occasional voice input |
| **Cloud storage (S3, etc.)** | Local-first tool doesn't need cloud persistence |
| **WebRTC peer-to-peer** | Server-mediated sync is simpler and more reliable |
| **Uppy** | react-dropzone is simpler for our needs |
| **RecordRTC** | Native MediaRecorder API is sufficient |
| **opus-media-recorder** | Only needed if targeting old browsers; modern browsers support WebM/Opus |

---

## Configuration Requirements

### Environment Variables

```env
# Required for voice transcription
OPENAI_API_KEY=sk-...

# Optional: Session configuration
SESSION_MAX_USERS=10
SESSION_TIMEOUT_MS=3600000
MAX_UPLOAD_SIZE_MB=10
```

### Whisper API Request Format

```typescript
const transcribe = async (audioBlob: Blob): Promise<TranscriptionResult> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  // Don't specify language - let Whisper auto-detect

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  return response.json();
};
```

---

## Version Verification

| Package | Claimed Version | Verification Date | Source |
|---------|-----------------|-------------------|--------|
| socket.io | 4.8.3 | 2026-01-27 | [npm](https://www.npmjs.com/package/socket.io) - "last published 23 days ago" |
| socket.io-client | 4.8.1 | 2026-01-27 | [npm](https://www.npmjs.com/package/socket.io-client) |
| react-dropzone | 14.3.8 | 2026-01-27 | [npm](https://www.npmjs.com/package/react-dropzone) |
| yjs (not using) | 13.6.28 | 2026-01-27 | [npm](https://www.npmjs.com/package/yjs) - "last published 11 days ago" |

---

## Migration Strategy

### Existing WebSocket Code

**Current (`ws` library):**
```typescript
// Server broadcasts to all connected clients
wss.clients.forEach(client => {
  client.send(JSON.stringify(update));
});
```

**New (Socket.IO rooms):**
```typescript
// Server broadcasts to specific room only
io.to(sessionId).emit('canvas-update', update);
```

**The change is minimal:** Replace broadcast-to-all with broadcast-to-room.

### Backward Compatibility

- Single-user mode continues to work (room of 1)
- Existing canvas sync protocol unchanged
- New features (voice, docs) are additive

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Whisper API choice | HIGH | Clear cost/complexity analysis, official docs |
| Socket.IO rooms | HIGH | Mature library, matches existing architecture |
| react-dropzone | HIGH | Industry standard, simple API |
| Local file storage | MEDIUM | Simple for MVP, may need revisiting for larger sessions |
| Version numbers | HIGH | Verified via npm search results |

---

## Open Questions for Roadmap

1. **Session persistence:** Should sessions survive server restart? (Currently: no)
2. **Voice chunk size:** Should we stream audio chunks or wait for complete utterance?
3. **Document preview:** How to handle PDF preview in gallery? (PDFjs?)
4. **Cursor sharing:** Do we show other users' cursors on canvas? (Excalidraw supports this)

---

## Sources

### Voice Transcription
- [OpenAI Speech-to-Text API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Whisper API Pricing vs Self-Hosted Costs](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)
- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [AssemblyAI: Whisper Browser + Node.js](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js)
- [Best STT Models 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)

### Multi-User WebSocket
- [Socket.IO Official Documentation](https://socket.io/)
- [Socket.IO Rooms](https://socket.io/docs/v3/rooms/)
- [Socket.IO npm Package](https://www.npmjs.com/package/socket.io)
- [Yjs Documentation](https://docs.yjs.dev/) (considered but not recommended)
- [y-websocket](https://github.com/yjs/y-websocket) (considered but not recommended)

### File Upload
- [react-dropzone Documentation](https://react-dropzone.js.org/)
- [react-dropzone GitHub](https://github.com/react-dropzone/react-dropzone)
- [react-dropzone npm](https://www.npmjs.com/package/react-dropzone)

### Browser Audio
- [MediaRecorder API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [Chrome MediaRecorder Blog](https://developer.chrome.com/blog/mediarecorder)
- [Whisper WebM/Opus Compatibility](https://github.com/openai/whisper/discussions/2292)
