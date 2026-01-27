---
phase: 05
plan: 02
title: "Client-side Canvas Sync Hooks"
completed: "2026-01-27"
duration: "~12min"

subsystem: multi-client-sync
tags: [socket.io, canvas-sync, throttling, react-hooks, excalidraw]

dependency-graph:
  requires:
    - "05-01: Canvas & Message Sync Infrastructure"
  provides:
    - "useCanvasSync hook for throttled canvas broadcasting"
    - "Extended useSocketIO with getSocket() and sync events"
    - "WhiteboardPanel onCanvasChange and updateFromRemote"
  affects:
    - "05-03: Real-time presence indicators"

tech-stack:
  added:
    - "lodash.throttle: ^4.1.1"
    - "@types/lodash.throttle: ^4.1.9"
  patterns:
    - "Throttled broadcasting at 60Hz (16ms)"
    - "Version-based merge on client"
    - "Socket ref exposure via getSocket()"

key-files:
  created:
    - "live-canvas-mcp/viewer/src/hooks/useCanvasSync.ts"
  modified:
    - "live-canvas-mcp/viewer/src/hooks/useSocketIO.ts"
    - "live-canvas-mcp/viewer/src/components/WhiteboardPanel.tsx"
    - "live-canvas-mcp/viewer/src/App.tsx"
    - "live-canvas-mcp/viewer/package.json"

decisions:
  - id: "05-02-throttle"
    decision: "16ms (60Hz) throttle interval"
    rationale: "Matches display refresh rate, perceptually smooth without flooding"
    alternatives: ["33ms (30Hz)", "50ms (20Hz)", "No throttle"]

metrics:
  tasks: 3
  commits: 3
  lines-changed: ~320
---

# Phase 5 Plan 2: Client-side Canvas Sync Hooks Summary

Client-side infrastructure for real-time canvas synchronization with throttled broadcasting and conflict-free merging.

## One-liner

Throttled 60Hz canvas broadcast with useCanvasSync hook, getSocket() exposure, and WhiteboardPanel sync integration.

## What Was Implemented

### Task 1: useCanvasSync Hook (b55fe4c)

Created `live-canvas-mcp/viewer/src/hooks/useCanvasSync.ts`:

**SyncableElement interface** - Client-side type matching server:
- Core fields: id, version, versionNonce, isDeleted
- All visual and type-specific properties from Excalidraw

**mergeElements function** - Identical to server algorithm:
- New elements from remote: add
- Higher version wins
- Same version: lower versionNonce wins (deterministic)

**useCanvasSync hook:**
- Accepts: socket, roomCode, onRemoteUpdate callback
- Maintains lastBroadcastRef for change detection
- Maintains localElementsRef for merge operations
- Sets up socket.on('canvas_update') listener
- Merges remote with local, updates refs, calls callback
- Implements broadcastChanges with version diffing
- Returns throttled broadcastChanges (60Hz)

**Throttle configuration:**
- 16ms interval (~60Hz)
- leading: true (immediate on first call)
- trailing: true (ensures final state sent)

### Task 2: Extended useSocketIO (9f6ebee)

Added to `live-canvas-mcp/viewer/src/hooks/useSocketIO.ts`:

**SyncableElement export** - For type sharing
**ChatMessage export** - For future chat feature

**Extended ServerToClientEvents:**
- canvas_update: { elements: SyncableElement[]; fromSocketId: string }
- message_received: ChatMessage

**Extended ClientToServerEvents:**
- canvas_update: { roomCode: string; elements: SyncableElement[] }
- message_send: { roomCode: string; content: string }

**Added getSocket():**
- Returns raw Socket instance or null
- Enables advanced hooks like useCanvasSync to attach listeners

### Task 3: Wired WhiteboardPanel and App (4f55b43)

**WhiteboardPanel.tsx changes:**
- Added `onCanvasChange` prop for broadcasting
- Added `updateFromRemote` method to ref API
- Updated handleChange to call onCanvasChange

**App.tsx changes:**
- Imported useCanvasSync
- Destructured getSocket from useSocketIO
- Initialized useCanvasSync with socket, roomCode, onRemoteUpdate
- Passed broadcastChanges to WhiteboardPanel (only when in session)
- Updated onCanvasState handler to use updateFromRemote

## Key Implementation Details

### Change Detection

```typescript
// Only broadcast elements that actually changed
const hasChanged = !lastBroadcast ||
  lastBroadcast.version !== element.version ||
  lastBroadcast.versionNonce !== element.versionNonce;
```

### Conditional Broadcasting

```typescript
// Only sync when in a multi-user session
<WhiteboardPanel
  onCanvasChange={roomCode ? broadcastChanges : undefined}
/>
```

### Merge on Receive

```typescript
// When receiving remote updates:
const merged = mergeElements(localElements, remoteElements);
localElementsRef.current = merged;  // Update local ref
onRemoteUpdate(merged);             // Update UI
```

## Deviations from Plan

**Minor: package.json fix** - Initial npm install didn't update package.json; manually added lodash.throttle dependency and amended commit.

## Verification Results

- TypeScript compilation: PASS
- Build (tsc + vite): PASS
- Key links verified:
  - socket.emit('canvas_update') in useCanvasSync.ts: VERIFIED
  - broadcastChanges/onCanvasChange in 3 files: VERIFIED
  - getSocket() in useSocketIO.ts: VERIFIED

## Success Criteria Status

- [x] lodash.throttle installed in viewer
- [x] useCanvasSync hook created with throttled broadcasting
- [x] useSocketIO exposes getSocket() and has canvas_update types
- [x] WhiteboardPanel has onCanvasChange prop and updateFromRemote method
- [x] App.tsx wires canvas sync only when in session
- [x] Throttling at 16ms interval (60Hz)
- [x] Build succeeds

## Next Phase Readiness

**Unlocked:**
- 05-03: Real-time presence indicators can build on socket infrastructure
- Manual testing: Two browsers can now sync canvas edits

**Blockers:** None

**Open Questions:** None
