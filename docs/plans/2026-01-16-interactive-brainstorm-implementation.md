# Implementation Plan: Interactive Brainstorming System v1

**Created:** 2026-01-16
**Design Doc:** `docs/brainstorm-interactive-system.md`
**Status:** Ready for implementation

---

## Overview

Transform brainstorming from TUI-only to an optional Interactive Mode with voice input, whiteboard drawing, and live notes - all while keeping the TUI as the AI's response channel.

---

## Component Breakdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COMPONENTS TO BUILD                          │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   WHISPER   │  │    LIVE     │  │     TUI     │  │   SKILL/   │ │
│  │   SERVER    │  │   CANVAS    │  │  INJECTION  │  │  PHASE-1   │ │
│  │             │  │   UPGRADE   │  │             │  │  UPDATES   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│        │                │                │                │        │
│        └────────────────┴────────────────┴────────────────┘        │
│                                  │                                  │
│                                  ▼                                  │
│                         INTEGRATION & TEST                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Epic 1: Local Whisper Server

**Goal:** HTTP API for speech-to-text transcription (EN/FR)

### Tasks

| # | Task | Details |
|---|------|---------|
| 1.1 | Choose Whisper implementation | `faster-whisper` recommended (GPU accelerated, Python) |
| 1.2 | Create whisper-server wrapper | Simple HTTP API: POST audio → GET transcript |
| 1.3 | Add language support | EN + FR, auto-detect or explicit param |
| 1.4 | Create startup script | `start-whisper.ps1` to run as background service |
| 1.5 | Test transcription quality | Test with EN and FR audio samples |

### API Design

```
POST /transcribe
Content-Type: audio/webm (or audio/wav)
Body: <audio binary>

Response:
{
  "text": "transcribed text here",
  "language": "en",
  "confidence": 0.95
}
```

### File Structure

```
Pipeline-Office/
├── whisper-server/
│   ├── server.py           # FastAPI server
│   ├── requirements.txt    # faster-whisper, fastapi, uvicorn
│   ├── start-whisper.ps1   # Startup script
│   └── README.md
```

---

## Epic 2: Live Canvas UI Upgrade

**Goal:** Replace current Fabric.js with Excalidraw, add voice input area, unified Send

### Tasks

| # | Task | Details |
|---|------|---------|
| 2.1 | Replace Fabric.js with Excalidraw | Embed @excalidraw/excalidraw React component |
| 2.2 | Add voice input area | Push-to-talk button, transcript textarea |
| 2.3 | Implement audio recording | MediaRecorder API, send to Whisper server |
| 2.4 | Add unified Send button | With checkboxes: ☑ Whiteboard ☐ Notes |
| 2.5 | Implement whiteboard capture | Export Excalidraw canvas as PNG/base64 |
| 2.6 | Add notes two-way sync | WebSocket sync with file, debounced writes |
| 2.7 | Update layout | Notes (left) + Whiteboard (right) + Input area (bottom) |

### New UI Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Live Canvas - Interactive Brainstorm                    [Status: Connected] │
├─────────────────────────────────┬────────────────────────────────────────────┤
│                                 │                                            │
│  NOTES                          │  WHITEBOARD (Excalidraw)                   │
│  ────────────────────────────   │  ──────────────────────────────────────    │
│                                 │                                            │
│  # Brainstorm Notes             │   ┌──────┐     ┌──────┐                   │
│                                 │   │ User │ ──▶ │Login │                   │
│  ## Core Concept                │   └──────┘     └──────┘                   │
│  - Task manager app             │                                            │
│                                 │   (Excalidraw canvas here)                 │
│  ## Features                    │                                            │
│  - Kanban boards                │                                            │
│                                 │                                            │
│  (editable, syncs to file)      │   (drawable by user and AI)                │
│                                 │                                            │
├─────────────────────────────────┴────────────────────────────────────────────┤
│  INPUT AREA                                                                   │
│                                                                               │
│  🎤 [Hold to Talk]                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Message appears here after voice or typing...                           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  Include: ☑ Whiteboard  ☐ Notes                              [Send ▶]       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### File Structure Changes

```
live-canvas-mcp/
├── src/
│   ├── index.ts              # MCP server (keep)
│   ├── server/
│   │   ├── http.ts           # Update: serve new viewer
│   │   └── websocket.ts      # Update: handle new message types
│   └── tools/                # Keep existing
├── viewer/                   # NEW: React app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── NotesPanel.tsx
│   │   │   ├── WhiteboardPanel.tsx    # Excalidraw wrapper
│   │   │   ├── InputArea.tsx          # Voice + text + Send
│   │   │   └── VoiceRecorder.tsx      # Push-to-talk logic
│   │   └── hooks/
│   │       ├── useWebSocket.ts
│   │       ├── useWhisper.ts          # Audio → transcript
│   │       └── useFileSync.ts         # Notes two-way sync
│   ├── package.json
│   └── vite.config.ts
└── package.json
```

---

## Epic 3: TUI Injection Mechanism

**Goal:** Send messages from Live Canvas into Claude's stdin

### Tasks

| # | Task | Details |
|---|------|---------|
| 3.1 | Research Claude Code stdin injection | Check how pipeline supervisor does it |
| 3.2 | Create injection endpoint | POST /api/inject → writes to Claude stdin |
| 3.3 | Format bundled messages | `[INTERACTIVE]\nMESSAGE: ...\nWHITEBOARD: ...` |
| 3.4 | Handle image attachment | Save PNG to temp file, include path in message |
| 3.5 | Test injection flow | Verify Claude receives and processes correctly |

### Message Format

```
[INTERACTIVE INPUT]

MESSAGE:
This is the login flow I'm thinking about. Can you clean it up?

WHITEBOARD: [See attached image: .pipeline/whiteboard-capture-1705412345.png]

NOTES: (not included)
```

### Injection Method

Based on existing pipeline code, likely uses named pipes or file-based IPC:

```typescript
// Option 1: Write to stdin file that Claude watches
fs.appendFileSync('.pipeline/claude-input.txt', formattedMessage);

// Option 2: Use PowerShell to inject (like supervisor)
exec(`powershell -Command "Send-ClaudeMessage -Message '${escaped}'"`)
```

---

## Epic 4: Phase-1 Updates (Startup Flow)

**Goal:** Restore Interactive Mode question, load skill when chosen

### Tasks

| # | Task | Details |
|---|------|---------|
| 4.1 | Update phase-1.md | Add AskUserQuestion for Interactive Mode |
| 4.2 | Create interactive-brainstorm skill | Context for Claude in interactive mode |
| 4.3 | Update claude-brainstorm.ps1 | Ensure servers can be started from skill |
| 4.4 | Add Whisper server startup | Start if not running when Interactive chosen |
| 4.5 | Add browser auto-open | Open localhost:3456 when Interactive chosen |

### Phase-1.md Changes

```markdown
### 0b. Ask Stack (existing)
...

### 0c. Ask Interactive Mode (NEW)
AskUserQuestion({
  questions: [{
    header: "Mode",
    question: "Would you like to use Interactive Mode?",
    options: [
      { label: "Yes - Voice + Live Canvas", description: "Voice input, visual whiteboard, live notes in browser" },
      { label: "No - Text only", description: "Traditional terminal-only brainstorming" }
    ],
    multiSelect: false
  }]
})

If "Yes":
1. Load interactive-brainstorm skill
2. Start Whisper server (if not running)
3. Start Live Canvas server
4. Open browser to localhost:3456
5. Update todos to include interactive context
```

### Interactive Brainstorm Skill

```markdown
# Skill: interactive-brainstorm

## Context
You are in Interactive Mode. The user has a Live Canvas open in their browser with:
- Notes panel (left) - synced with docs/brainstorm-notes.md
- Whiteboard panel (right) - Excalidraw canvas
- Voice input area (bottom) - push-to-talk transcription

## Receiving Input
You will receive `[INTERACTIVE INPUT]` messages containing:
- MESSAGE: Text from user (voice transcribed or typed)
- WHITEBOARD: Path to PNG image of current whiteboard (if included)
- NOTES: Current notes content (if included)

## When you receive a WHITEBOARD image:
1. Analyze the image (you are multimodal)
2. Identify what the user drew vs what you drew previously
3. Interpret the user's intent
4. Either:
   - Refine their rough sketch into proper diagram
   - Update notes based on what they drew
   - Ask clarifying questions

## Updating the Canvas
Use the Excalidraw MCP tools to:
- Create shapes: create_shape
- Update shapes: update_shape
- Connect elements: connect_shapes
- Clear canvas: clear_canvas

## Updating Notes
Use the live-canvas MCP tools to:
- Append notes: append_notes
- Update section: update_section
- Get notes: get_notes

## Important
- Always respond in the TUI (terminal)
- Update canvas/notes via MCP tools
- The user sees both your terminal response AND canvas updates
```

---

## Epic 5: Integration & Testing

**Goal:** End-to-end testing of the complete flow

### Tasks

| # | Task | Details |
|---|------|---------|
| 5.1 | Integration test: Voice → TUI | Record audio, verify transcript reaches Claude |
| 5.2 | Integration test: Drawing → TUI | Draw, click Send, verify image reaches Claude |
| 5.3 | Integration test: Notes sync | Edit in canvas, verify file updates (and vice versa) |
| 5.4 | Integration test: AI → Canvas | Claude updates whiteboard, verify canvas reflects |
| 5.5 | Full flow test | Complete brainstorm session using all features |
| 5.6 | Error handling | Test Whisper offline, Canvas disconnected, etc. |

---

## Implementation Order

```
Phase 1: Foundation
├── Epic 1: Whisper Server (1.1-1.5)
└── Epic 3: TUI Injection (3.1-3.2)

Phase 2: UI
└── Epic 2: Live Canvas Upgrade (2.1-2.7)

Phase 3: Integration
├── Epic 3: TUI Injection (3.3-3.5)
├── Epic 4: Phase-1 Updates (4.1-4.5)
└── Epic 5: Testing (5.1-5.6)
```

---

## Dependencies

| Dependency | Why Needed | Install |
|------------|------------|---------|
| `faster-whisper` | Local transcription | `pip install faster-whisper` |
| `fastapi` + `uvicorn` | Whisper HTTP API | `pip install fastapi uvicorn` |
| `@excalidraw/excalidraw` | Whiteboard component | `npm install @excalidraw/excalidraw` |
| React 18+ | Excalidraw requirement | Already in viewer |
| Vite | Build viewer | Already configured |

---

## Success Criteria

- [ ] User can speak, see transcript, click Send, Claude responds
- [ ] User can draw, click Send with Whiteboard checked, Claude interprets
- [ ] Notes sync two-way between canvas and file
- [ ] Claude can update whiteboard via Excalidraw MCP
- [ ] Startup flow asks Stack → Interactive Mode → opens browser if Yes
- [ ] Works with EN and FR voice input

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Whisper GPU not available | Slow transcription | Use whisper.cpp (CPU) as fallback |
| Excalidraw bundle size | Slow load | Code split, lazy load |
| Stdin injection unreliable | Messages lost | Use file-based queue with confirmation |
| Image too large for context | Claude can't process | Compress/resize before sending |

---

## Estimated Effort

| Epic | Effort |
|------|--------|
| Epic 1: Whisper Server | Small |
| Epic 2: Live Canvas Upgrade | Large |
| Epic 3: TUI Injection | Medium |
| Epic 4: Phase-1 Updates | Small |
| Epic 5: Integration & Testing | Medium |

---

**Ready to start implementation.**
