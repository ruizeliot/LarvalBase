# Brainstorm Notes: Interactive Brainstorming System

**Session Started:** 2026-01-16
**Last Updated:** 2026-01-16

---

## Core Concept

**The brainstorming goal is unchanged:** Collaborate with user → regularly update notes → produce complete `docs/brainstorm-notes.md`.

**Interactive Mode adds more I/O channels** between user and agent:

```
                    TUI-Only Mode          Interactive Mode
                    ─────────────          ────────────────
USER → AGENT        Keyboard (text)        Keyboard (text)
                                           + Voice (push-to-talk)
                                           + Drawing (whiteboard)
                                           + Direct note edits

AGENT → USER        Terminal (text)        Terminal (text)
                                           + Notes panel (live doc)
                                           + Whiteboard (diagrams)
```

**Same process, richer interaction.**

**Two Interface Modes:**
1. **TUI Mode** - Traditional text interface in terminal
2. **Interactive Mode** - TUI + Live Canvas with voice + visual collaboration

---

## Startup Flow (Restored)

```
claude-brainstorm
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      TUI Opens                               │
│                                                              │
│  Agent: "What platform are you building for?"                │
│         ○ Desktop (Tauri)                                    │
│         ○ Unity (XR/VR)                                      │
│         ○ Android (Tauri Mobile)                             │
│                                                              │
│  User selects...                                             │
│                                                              │
│  Agent: "Would you like to use Interactive Mode?"            │
│         ○ Yes - Voice + Live Canvas                          │
│         ○ No - Text-only in terminal                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
       │
       ├── "No" ──▶ Continue in TUI only (current behavior)
       │
       └── "Yes" ─┐
                  │
                  ▼
   ┌──────────────────────────────────────────────────────┐
   │ 1. Load "interactive-brainstorm" skill/context       │
   │ 2. Start Whisper server (if not already running)     │
   │ 3. Start Live Canvas server                          │
   │ 4. Open http://localhost:3456 in browser             │
   │ 5. Agent now expects events from canvas              │
   │ 6. Continue brainstorming with both interfaces       │
   └──────────────────────────────────────────────────────┘
```

**Key:** The agent uses `AskUserQuestion` for both questions. If Interactive is chosen, it loads additional context and opens the browser.

---

## Interactive Mode Features

### Voice Interface (v1: Push-to-Talk with Review)

```
┌──────────────────────────────────────────────────────────────┐
│  Voice Input Area                                            │
│                                                              │
│  🎤 [Hold to Talk]     ← Press and hold to record            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ I want a sidebar with navigation and a dark mode      │  │
│  │ toggle in the header_                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ↑ Transcript appears here (editable)                        │
│                                                              │
│  [Send to Claude ▶]    ← Click to inject into TUI            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Flow:**
1. **Hold button** → Start recording
2. **Release** → Whisper transcribes → text appears in input box
3. **Review/edit** → User can fix transcription errors
4. **Select what to include** → Check boxes
5. **Click Send** → Bundle injected into TUI
6. **Claude responds** → In terminal + updates canvas

**Future (v2): Always-On Listening**
- Toggle on continuous listening
- AI passively monitors two humans brainstorming
- Updates notes/whiteboard without explicit send
- (Deferred to later version)

---

### Unified Send Interface (Confirmed)

```
┌──────────────────────────────────────────────────────────────────────┐
│  INPUT AREA                                                          │
│                                                                      │
│  🎤 [Hold to Talk]                                                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ This is the login flow I'm thinking about. Can you clean it   │  │
│  │ up and add it to the notes?                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Include:                                                            │
│  ☑ Whiteboard    ☐ Notes                                            │
│                                                                      │
│  [Send ▶]                                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**What Claude receives (injected into TUI):**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [INTERACTIVE INPUT]                                                  │
│                                                                      │
│ MESSAGE:                                                             │
│ "This is the login flow I'm thinking about. Can you clean it        │
│ up and add it to the notes?"                                         │
│                                                                      │
│ WHITEBOARD: [image - base64 PNG or file path]                       │
│                                                                      │
│ NOTES: (not included)                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Claude's responsibility when receiving whiteboard:**
1. Analyze the image (multimodal)
2. Understand what user drew vs what AI drew (by comparing to known state)
3. Interpret user intent
4. Act: refine drawing, update notes, respond with questions

**Checkbox behaviors:**
- **Whiteboard checked** → Capture and include current whiteboard as image
- **Notes checked** → Include current notes content (useful if user edited directly)
- **Neither checked** → Just send the text message

### Notes Panel (Left)
- **AI's primary writing space** - captures ideas, structures thoughts
- **User can make small edits** - project name, minor corrections
- **Two-way sync with `docs/brainstorm-notes.md`:**
  - User edits in canvas → file updated
  - AI updates file (via MCP) → canvas refreshes
  - At startup → canvas loads from file

### Whiteboard Panel (Right)
- **AI draws** - UML diagrams, flowcharts, architecture, mockups
- **User can:**
  - Drag/drop elements (reposition legend, move boxes)
  - Edit text labels
  - Draw freehand → AI recognizes and interprets!
- AI should understand user drawings using image recognition

---

## Key Technical Insight: Drawing Recognition

Claude Code is multimodal - it can understand images. When user draws:

```
User draws on whiteboard
        │
        ▼
Canvas captured as image (PNG/base64)
        │
        ▼
Image sent to Claude via API
        │
        ▼
Claude interprets: "That looks like a database connected to a server"
        │
        ▼
Claude responds/updates notes/refines drawing
```

---

## Drawing Workflow (Confirmed)

**Trigger:** User clicks "Analyze" button when done drawing.

**AI Process:**
1. Capture whiteboard as image
2. Compare: What was AI-drawn (`ai-*` objects) vs user-added (`user-*` objects)
3. Interpret user's intent
4. Act: Refine drawing, update notes, or both

### Example Scenarios

**Scenario 1: User adds rough box to existing UML**
```
Before:                    User draws:                  After AI analyzes:
┌──────┐                   ┌──────┐                     ┌──────┐  ┌──────┐
│ User │                   │ User │                     │ User │  │ API  │
└──┬───┘                   └──┬───┘                     └──┬───┘  └──────┘
   │                          │  [rough]                   │         │
   ▼                          ▼    ↓                       ▼         ▼
┌──────┐                   ┌──────┐ □                   ┌──────┐◄───┘
│  DB  │                   │  DB  │───→                 │  DB  │
└──────┘                   └──────┘                     └──────┘

AI action: Deletes rough box, creates proper "API" box, connects it
Notes updated: "Added API layer between User and DB"
```

**Scenario 2: User draws flow arrows to show sequence**
```
User draws arrows:              AI interprets:
  ┌─┐                           Notes updated:
  │1│ ───→ Login                "User flow:
  └─┘      │                     1. User logs in
           ▼                     2. Dashboard loads
  ┌─┐                            3. User selects project"
  │2│ ───→ Dashboard
  └─┘      │                    Whiteboard: AI creates proper
           ▼                    flowchart with styled boxes
  ┌─┐
  │3│ ───→ Project
  └─┘
```

**Scenario 3: User crosses out / scribbles over element**
```
Before:                    User scribbles:              After:
┌──────┐  ┌──────┐        ┌──────┐  ┌──────┐           ┌──────┐
│ User │  │ Admin│        │ User │  │XXXXXX│           │ User │
└──────┘  └──────┘        └──────┘  └──────┘           └──────┘

AI interprets scribble as "delete this" → removes Admin box
Notes updated: "Removed Admin role from design"
```

**Scenario 4: User draws from blank canvas**
```
User draws rough sketch:        AI creates:

   □───────□                    ┌────────┐    ┌────────┐
   │       │                    │Frontend│───▶│Backend │
   □       □                    └────────┘    └────────┘
                                     │             │
                                     ▼             ▼
                                ┌────────┐    ┌────────┐
                                │  User  │    │   DB   │
                                └────────┘    └────────┘

Notes: "Architecture: Frontend connects to Backend,
        Backend connects to DB, Frontend serves Users"
```

---

## Open Questions

1. **What triggers AI interpretation of drawings?**
   - ✅ **CONFIRMED: Explicit "Analyze" button**

2. **Voice transcription technology?**
   - Web Speech API (browser-native, free, okay quality)
   - Whisper API (OpenAI, better quality, costs money)
   - Local Whisper (free, good quality, needs GPU)

3. **How does "always-on" work practically?**
   - Continuous transcription → batched every N seconds?
   - AI decides when to interject vs. stay silent?
   - Privacy considerations?

4. **Event flow between Canvas and TUI?**
   - Does TUI still exist when in Interactive mode?
   - Or does Interactive mode fully replace TUI during session?

---

## Current System Summary

```
CURRENT:
┌──────────┐         HTTP POST         ┌─────────────────────────────┐
│   TUI    │ ───────────────────────▶  │        LIVE CANVAS          │
│ (Claude) │    AI writes notes/draws  │  Notes     │   Whiteboard   │
└──────────┘                           │  (edit)    │   (draw)       │
     ▲                                 └─────┬──────┴───────┬────────┘
     │                                       │              │
   User                                  WebSocket      WebSocket
   types                                     │              │
                                             ▼              ▼
                                       Server State (notes, objects)
                                             │
                                             ╳ ← AI CANNOT SEE THIS
```

**Gap:** AI pushes TO canvas but cannot SEE what user does on canvas.

---

## Technical Architecture (v1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERACTIVE MODE                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    LIVE CANVAS (Browser)                                 ││
│  │                                                                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐     ││
│  │  │ Voice Input  │  │    Notes     │  │   Whiteboard (Excalidraw)  │     ││
│  │  │              │  │              │  │                            │     ││
│  │  │ 🎤 Push-to-  │  │  Syncs with  │  │  User draws → [Analyze] → │     ││
│  │  │    Talk      │  │  brainstorm- │  │  capture as PNG/base64     │     ││
│  │  │              │  │  notes.md    │  │                            │     ││
│  │  └──────┬───────┘  └──────┬───────┘  └─────────────┬──────────────┘     ││
│  │         │                 │                        │                     ││
│  └─────────┼─────────────────┼────────────────────────┼─────────────────────┘│
│            │                 │                        │                      │
│            ▼                 ▼                        ▼                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                         EVENT FLOW TO TUI                                 ││
│  │                                                                           ││
│  │   Voice ──▶ Whisper Server ──▶ Transcript text                           ││
│  │   Notes ──▶ File watcher ──▶ Change notification                         ││
│  │   Drawing ─▶ Canvas export ──▶ PNG image (base64)                        ││
│  │                                                                           ││
│  └────────────────────────────────┬─────────────────────────────────────────┘│
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            TUI (Claude Code)                                   │
│                                                                                │
│  Skill/Command loaded: "interactive-brainstorm"                                │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ RECEIVES:                          │ SENDS (via MCP):                    │  │
│  │                                    │                                     │  │
│  │ • Voice transcript (text)          │ • Update notes (append/replace)    │  │
│  │ • Notes changes (diff)             │ • Draw on whiteboard (Excalidraw)  │  │
│  │ • Whiteboard image (multimodal)    │ • Clear/modify shapes              │  │
│  │                                    │                                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  Claude responds in terminal + updates canvas                                  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Component Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Whiteboard** | Excalidraw (or mcp_excalidraw) | Drawing, diagrams, mockups |
| **Voice** | Local Whisper Server | Speech-to-text (EN, FR, expandable) |
| **Notes** | Markdown file + sync | Live document editing |
| **Image Understanding** | Claude multimodal | Interpret user drawings |
| **Agent → Canvas** | Excalidraw MCP tools | AI draws/modifies whiteboard |

### Voice: Local Whisper Server (Confirmed)

**Why local Whisper:**
- High quality transcription
- Multi-language: English, French (expandable to 90+ languages)
- Privacy: audio stays local
- Free: no per-minute API costs

**Implementation options:**
1. **whisper.cpp** - C++ port, fast, runs on CPU
2. **faster-whisper** - Python, CTranslate2 backend, GPU accelerated
3. **whisper-server** - REST API wrapper around whisper

**Suggested:** `faster-whisper` with a simple HTTP API wrapper
- Runs as background service
- Canvas sends audio chunks → gets transcript back
- Auto-detects language or can be set explicitly

### Data Flow Summary

```
USER → AGENT:
  Voice (push-to-talk) → Whisper → text → Claude
  Notes edit → file change → Claude notified
  Drawing + [Analyze] → PNG capture → Claude (multimodal)

AGENT → USER:
  Response text → Terminal (TUI)
  Update notes → MCP → file → synced to canvas
  Draw/refine → Excalidraw MCP → whiteboard updated
```

---

## Scope

### v1 (Build Now)

| Feature | Details |
|---------|---------|
| **Push-to-talk voice** | Hold button → record → Whisper → text in input box |
| **Local Whisper** | EN + FR support |
| **Unified Send** | Message + checkboxes (Whiteboard, Notes) |
| **Excalidraw whiteboard** | User draws, AI refines via MCP |
| **Image analysis** | Claude multimodal interprets user drawings |
| **Two-way notes sync** | Canvas ↔ docs/brainstorm-notes.md |
| **Mode selection** | Stack question → Interactive question at startup |
| **Inject to TUI** | Send button injects bundled input into Claude stdin |

### v2 (Future)

| Feature | Details |
|---------|---------|
| Always-on listening | AI monitors conversation passively |
| More languages | Beyond EN/FR |
| Keyboard shortcuts | Quick send, quick record |
| Auto-detect changes | No checkboxes needed |
| Diagram templates | UML, flowchart, architecture presets |
| Multi-user collaboration | Multiple people on same canvas |

---

## Summary

**Interactive Mode** adds richer I/O channels to brainstorming while keeping the same goal: produce `docs/brainstorm-notes.md`.

```
USER → AGENT:
  • Keyboard (text)
  • Voice (push-to-talk → Whisper → review → Send)
  • Drawing (whiteboard → Send with image)
  • Direct note edits (two-way sync)

AGENT → USER:
  • Terminal responses (TUI)
  • Live notes (synced to file)
  • Whiteboard diagrams (Excalidraw MCP)
```

**Status:** Design complete. Ready for implementation planning.

---

*This document is updated live during brainstorming.*
