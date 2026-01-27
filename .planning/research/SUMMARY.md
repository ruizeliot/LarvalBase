# Project Research Summary

**Project:** Live Canvas MCP - Brainstorm Visual System v2.0
**Domain:** Multi-User Collaborative Brainstorming with Voice Input and Document Sharing
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

The v2.0 milestone transforms the existing single-user AI brainstorming tool into a collaborative platform with three major additions: multi-user real-time collaboration (host mode with browser-based guest access), voice input via OpenAI Whisper (push-to-talk with EN/FR auto-detection), and a shared document gallery with drag-drop to AI context. The existing stack (React 18, Vite, Excalidraw, Zustand, WebSocket via `ws`) remains intact - these are additive features.

**Recommended approach:** Use Socket.IO rooms for session management (extending existing WebSocket infrastructure), OpenAI Whisper API for transcription (cost-effective at brainstorming volumes), and react-dropzone with local filesystem storage for documents. The research strongly recommends AGAINST Yjs/CRDT for this use case - the existing WebSocket sync is sufficient; we need room-based routing, not conflict-free merging. The key architectural decision is treating the AI conversation as a unified stream where all participants contribute to one conversation, not separate per-user threads.

**Critical risks:** (1) Race conditions during client connection can cause state divergence - mitigate with double-fetch strategy; (2) Last-write-wins on concurrent edits loses data - use version nonce pattern from Excalidraw; (3) iOS Safari MediaRecorder uses different audio formats - test on real devices and implement format fallbacks; (4) File upload security vulnerabilities in multi-user context - allowlist file types and validate content. The good news: these are well-documented problems with proven solutions.

## Key Findings

### Recommended Stack

The stack extends the existing v1.0 foundation. No changes to core technologies - only additions.

**Core additions:**
- **Socket.IO (^4.8.3):** Room-based WebSocket management - replaces raw `ws` broadcast-to-all with room-scoped messaging
- **socket.io-client (^4.8.1):** Client-side WebSocket with built-in reconnection and room joining
- **react-dropzone (^14.3.8):** Drag-drop file upload UI - simple hook-based API, TypeScript support
- **OpenAI Whisper API (whisper-1):** Speech-to-text - $0.006/min, no infrastructure, EN/FR auto-detect built-in
- **MediaRecorder API (browser native):** Audio capture - produces WebM/Opus directly compatible with Whisper

**What NOT to add:**
- Yjs/CRDT - overkill for this use case; existing sync + rooms is sufficient
- Self-hosted Whisper - only makes sense at 3000+ hours/month
- Cloud storage (S3) - local-first tool doesn't need it
- WebRTC peer-to-peer - server-mediated sync is simpler and more reliable

### Expected Features

**Must have (table stakes):**
- Real-time cursor presence - users need to know where others are working
- Simultaneous editing - multiple users edit canvas without conflicts
- Join via URL/code - no software install for guests, browser-only access
- Instant sync (<500ms perceived) - edits must feel real-time
- Participant list - know who's in the session
- Push-to-talk voice activation - prevents accidental recording
- Visual recording indicator - user must know when mic is active
- Drag-drop document upload - standard file upload pattern
- Gallery visible to all users - shared resources for collaboration

**Should have (differentiators):**
- AI sees unified stream - all participants treated as one "user" for simpler AI interaction
- Anonymous participation - no accounts required, instant join
- Local-only hosting - data stays on host machine, privacy advantage
- EN/FR auto-detection per utterance - no manual language switching
- AI reads document content - answer questions about uploaded PDFs/images
- Edit transcription before send - allow correction of transcription errors

**Defer (v2.1+):**
- Speaker attribution in transcripts - requires diarization, high complexity
- Local Whisper processing - requires GPU infrastructure
- Pin documents to canvas - medium complexity, not essential
- Gallery search/filter - can ship without for MVP

**Anti-features (explicitly DO NOT build):**
- Live voice chat between users - use Discord/Teams for that
- User accounts/authentication - adds friction, scope creep
- Voice-activated (always listening) - privacy nightmare
- Real-time streaming transcription - partial results confuse users
- Complex permission systems - host/guest distinction is sufficient

### Architecture Approach

The architecture extends the existing single-host MCP server with room-based routing. Key pattern: Socket.IO rooms for session management where the host starts a session, gets a 6-character code, and guests join via browser URL. All canvas/voice/document updates broadcast to room only, not to all connected clients.

**Major components:**
1. **Room Manager** (`src/rooms/manager.ts`) - Session creation, join codes, host/guest role assignment
2. **Voice Handler** (`src/voice/handler.ts`) - MediaRecorder capture, Whisper API integration, transcription broadcast
3. **Document Gallery** (`src/gallery/store.ts`) - File storage in `.planning/sessions/{id}/documents/`, metadata sync
4. **Socket.IO Layer** (replaces raw `ws`) - Room-scoped broadcast, reconnection handling, user presence

**Data flow pattern:**
```
User input (canvas/voice/doc) --> Socket.IO --> Room broadcast --> All room clients
                                     |
                                     v
                              Claude via MCP (sees unified stream)
```

### Critical Pitfalls

1. **Race Condition Window (M1)** - New clients miss events between fetching state and establishing WebSocket. **Mitigate:** Double-fetch strategy (fetch state again after WebSocket connects) or buffer events until initial load completes.

2. **Last-Write-Wins Data Loss (M2)** - Two users editing same element concurrently causes silent data loss. **Mitigate:** Use version nonce pattern from Excalidraw - add `versionNonce` field with random integer for deterministic conflict resolution.

3. **iOS Safari MediaRecorder (M4)** - Different audio codecs than Chrome/Firefox cause Whisper failures. **Mitigate:** Smart format detection with fallbacks (`audio/webm;codecs=opus` -> `audio/webm` -> `audio/mp4` -> `audio/wav`), test on real iOS devices.

4. **File Upload Security (M5)** - Multi-user context means one user's upload is visible to all. **Mitigate:** Allowlist file types, validate content (don't trust MIME headers), store outside web root, rename to UUIDs, serve with `Content-Disposition: attachment`.

5. **WebSocket Reconnection (M6)** - Network blips lose session context. **Mitigate:** Session tokens that map back to user identity, state recovery protocol on reconnect, exponential backoff (1s, 2s, 4s with jitter, max 30s).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Room Infrastructure
**Rationale:** Foundation for all multi-user features - nothing else works without rooms
**Delivers:** Room manager, join codes, room-scoped WebSocket routing, host/guest roles
**Addresses:** Join via URL/code, participant list, host controls
**Avoids:** Race condition window (M1) - design connection protocol correctly from start; Echo loops (M7) - exclude sender from broadcasts

### Phase 2: Multi-Client Sync
**Rationale:** Depends on room infrastructure; enables all subsequent shared features
**Delivers:** Canvas sync via room broadcast, notes sync, basic reconnection
**Uses:** Socket.IO rooms from Phase 1
**Implements:** Room-scoped state, version nonce pattern for conflict resolution
**Avoids:** Last-write-wins data loss (M2), multiplayer undo corruption (M3 - clear undo stack on peer updates)

### Phase 3: User Presence
**Rationale:** Depends on sync infrastructure; high-value table stakes feature
**Delivers:** Real-time cursor positions, user list with colors/names, "user is typing" indicators
**Addresses:** Cursor presence (table stakes), participant list
**Avoids:** Cursor flood (M12) - throttle updates to 50-100ms

### Phase 4: Voice Input
**Rationale:** Can begin after rooms exist; parallel path with document gallery
**Delivers:** Push-to-talk UI, MediaRecorder capture, Whisper API integration, transcription broadcast
**Addresses:** Push-to-talk activation, visual recording indicator, transcription display, EN/FR auto-detect
**Avoids:** iOS Safari incompatibility (M4) - test on real devices; 30-second chunking (M9) - use VAD-based chunking

### Phase 5: Document Gallery
**Rationale:** Can begin after sync infrastructure exists; parallel with voice
**Delivers:** react-dropzone upload, local file storage, gallery UI, metadata sync, drag to AI context
**Addresses:** Drag-drop upload, image previews, gallery visible to all, drag to AI
**Avoids:** File upload security (M5) - allowlist types, validate content, store outside web root

### Phase Ordering Rationale

- **Rooms first (Phase 1)** - All multi-user features depend on room-scoped routing. Without this, broadcasts go to all clients (including other sessions).
- **Sync before presence (Phase 2 before 3)** - Canvas sync is higher priority than cursors; presence is an enhancement to working sync.
- **Voice and docs parallel (Phase 4-5)** - These features are independent after Phase 2 completes. Can be built in parallel or either order.
- **Pitfall mitigation early** - Phase 1-2 must address connection race conditions, conflict resolution, and reconnection. Deferring these creates technical debt that compounds.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Voice):** iOS Safari audio format compatibility needs device testing; VAD-based chunking needs library evaluation
- **Phase 5 (Documents):** PDF preview rendering (PDFjs?); AI document content extraction approach

Phases with standard patterns (skip research-phase):
- **Phase 1 (Rooms):** Socket.IO rooms are extremely well-documented, established pattern
- **Phase 2 (Sync):** Excalidraw's version nonce pattern is documented in their blog
- **Phase 3 (Presence):** Standard cursor sync pattern, no special research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified on npm with recent updates; Whisper API has official docs |
| Features | HIGH | Based on competitive analysis (Miro, FigJam, Mural) and explicit PROJECT.md requirements |
| Architecture | HIGH | Socket.IO rooms match existing WebSocket architecture; Excalidraw patterns documented |
| Pitfalls | HIGH | Multiple sources for each pitfall; Excalidraw blog provides battle-tested solutions |

**Overall confidence:** HIGH

### Gaps to Address

- **Whisper mixed-language utterances:** EN/FR code-switching within single utterance is poorly supported by Whisper. Need to decide: bias toward majority language, user preference, or segment-based detection. Recommend: per-utterance detection (push-to-talk encourages short utterances) with user preference fallback.

- **Session persistence:** Research didn't definitively answer whether sessions should survive server restart. Recommend: no for MVP (keeps implementation simple), consider for v2.1.

- **Document content extraction:** How does AI read uploaded PDFs? Need to evaluate: pdf-parse library, Claude's native PDF handling, or defer AI document reading to v2.1.

- **Cursor sharing via Excalidraw:** Excalidraw has built-in collaboration features. Need to evaluate: use Excalidraw's native collab vs. custom cursor layer. Recommend: research Excalidraw's collaboration API during Phase 3 planning.

## Sources

### Primary (HIGH confidence)
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/) - room-based routing patterns
- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text) - transcription integration
- [react-dropzone Documentation](https://react-dropzone.js.org/) - file upload patterns
- [Excalidraw P2P Collaboration Blog](https://blog.excalidraw.com/building-excalidraw-p2p-collaboration-feature/) - version nonce pattern, multiplayer challenges

### Secondary (MEDIUM confidence)
- [Whisper API Pricing Analysis](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed) - cost comparison
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) - security patterns
- [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices) - reconnection patterns
- [Miro](https://miro.com/), [FigJam](https://www.figma.com/figjam/), [Mural](https://www.mural.co/) - competitive feature analysis

### Tertiary (LOW confidence)
- [iPhone Safari MediaRecorder Guide](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription) - iOS workarounds (needs device validation)
- [Whisper Language Detection GitHub Discussions](https://github.com/openai/whisper/discussions/1456) - mixed-language handling (community solutions, not official)

---
*Research completed: 2026-01-27*
*Ready for roadmap: yes*
