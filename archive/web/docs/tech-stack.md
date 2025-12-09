# Tech Stack

**Project:** PipelineWebGUI
**Date:** 2025-11-28
**Updated:** Feature Addition (Split Terminal, Drag-Drop, Delete Pipeline, Pipeline Analytics)

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Type safety |
| Vite | 7.x | Build tool, dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| Zustand | 5.x | State management |
| xterm.js | 5.x | Terminal emulation in browser |
| React Router | 7.x | Client-side routing |
| react-dropzone | 14.x | Drag-and-drop file upload |

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express | 5.x | HTTP framework (extends existing coordinator) |
| node-pty | 1.x | Pseudoterminal spawning for tmux attach |
| ws | 8.x | WebSocket server |
| jsonwebtoken | 9.x | JWT creation/verification |
| bcrypt | 5.x | Password hashing (if stored) |
| multer | 2.x | File upload handling |

## Database

| Technology | Version | Purpose |
|------------|---------|---------|
| SQLite | 3.x | Persistent storage (workers, tokens, pipeline state) |
| better-sqlite3 | 11.x | Node.js SQLite driver |

## Testing

| Technology | Purpose |
|------------|---------|
| Cypress | E2E testing |
| Jest | Unit testing |

## Deployment

| Technology | Purpose |
|------------|---------|
| PM2 | Process management |
| Caddy | Reverse proxy (dev environment) |

---

## Architecture Notes

### Coordinator Extension

The dashboard backend extends the existing `coordinator.js` rather than being a separate service:

```
coordinator.js
├── Existing: Worker registration, task dispatch
├── New: HTTP API routes (/api/*)
├── New: WebSocket terminal streaming
├── New: JWT authentication middleware
└── New: File upload handling (brainstorm notes)
```

### Terminal Streaming

```
Browser (xterm.js) ←WebSocket→ Coordinator ←pty→ tmux attach
```

- `node-pty` spawns `tmux attach -t <session>`
- PTY output streamed to browser via WebSocket
- User input sent back through same channel
- **Split View:** Two simultaneous terminal connections (Supervisor + Worker)

### Split Terminal Architecture

```
Pipeline Graph View
├── Phase Diagram Component (top)
└── Split Terminal Container (bottom)
    ├── Left Pane: Supervisor Terminal
    │   ├── xterm.js instance
    │   ├── WebSocket to supervisor-{project} tmux session
    │   └── Fixed input bar (CSS: position: fixed)
    └── Right Pane: Worker Terminal
        ├── xterm.js instance
        ├── WebSocket to worker-{project} tmux session
        └── Fixed input bar (CSS: position: fixed)
```

### State Management

```
Zustand stores:
├── authStore - JWT token, user state
├── pipelineStore - Pipeline list, current pipeline, delete operations
├── workerStore - Worker list, status
├── terminalStore - Active terminal sessions (supports multiple)
└── uploadStore - File upload state (drag-drop)
```

### WebSocket Protocol

Multiplexed WebSocket connection handles:
- Pipeline/worker state updates
- Terminal I/O streams (multiple concurrent)
- Authentication

### File Upload Flow (Brainstorm Notes)

```
1. User drags brainstorm-notes.md onto drop zone
2. Client validates: .md extension, reasonable size
3. Client uploads to POST /api/pipelines with multipart form
4. Server saves to project/docs/brainstorm-notes.md
5. Server starts pipeline from phase 0b (skipping 0a)
```

### Delete Pipeline Flow

```
1. User clicks delete on pipeline
2. Confirmation modal shows project path
3. Optional checkbox: "Also delete project folder"
4. DELETE /api/pipelines/:id?deleteFolder=true
5. Server:
   - Removes pipeline from registry
   - If deleteFolder: rm -rf project path
6. WebSocket broadcasts pipeline_deleted event
7. UI removes from list
```

---

## Rationale

1. **React 19 + Vite 7** - Latest stable versions, consistent with IMT stack
2. **Zustand** - Lightweight state management, simpler than Redux for this scale
3. **xterm.js** - De facto standard for browser terminal emulation
4. **SQLite** - No need for separate database server, portable
5. **Extend coordinator** - Single deployment unit, shared state, simpler architecture
6. **JWT auth** - Stateless, works for both REST and WebSocket
7. **react-dropzone** - Well-maintained, accessible drag-drop component
8. **multer** - Standard Express middleware for file uploads

---

## Dependencies

### Frontend (web/package.json)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.11.0",
    "react-dropzone": "^14.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "cypress": "^14.0.0"
  }
}
```

### Backend (agent/package.json additions)

```json
{
  "dependencies": {
    "express": "^5.0.0",
    "ws": "^8.18.0",
    "jsonwebtoken": "^9.0.0",
    "node-pty": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "multer": "^2.0.0"
  }
}
```

---

## New Feature Requirements

### Split Terminal View (US-022)

- Two xterm.js instances side-by-side
- CSS Grid or Flexbox layout for responsive split
- Independent WebSocket connections per terminal
- Fixed position input bars (don't scroll with terminal content)

### Drag-and-Drop Upload (US-006)

- react-dropzone for accessible drag-drop zone
- File type validation (.md only)
- Preview with remove option
- Auto-set start phase to 0b when file uploaded

### Delete Pipeline (US-021)

- Confirmation modal with destructive action styling
- Optional checkbox for folder deletion
- Server-side rm -rf with path validation (prevent traversal)

### Pipeline Analytics (US-023, US-024, US-025)

**Data Sources (already exist in pipeline system):**
- `.pipeline/manifest.json` - phases, timing, costs, test results
- `.pipeline/supervisor-decisions.log` - decision log entries (v6.0+)
- `.pipeline/runs/*/metadata.json` - historical run data

**Implementation Requirements:**
- New Analytics view component with 3 tabs: Metrics, Decisions, History
- Parse manifest.json for phase durations (startedAt/completedAt timestamps)
- Parse supervisor-decisions.log for decision entries (format: `[TIMESTAMP] TYPE: description`)
- Directory listing for runs/ to populate history
- 30-second polling interval for running pipelines (or WebSocket push)
- JSON export functionality for both metrics and decisions
- Simple trend chart (can use basic SVG/CSS, no chart library required)
- Filter buttons for decision types

**API Additions:**
```
GET /api/pipelines/:id/analytics     # Returns manifest-based metrics
GET /api/pipelines/:id/decisions     # Returns parsed decision log
GET /api/pipelines/:id/history       # Returns list of runs
GET /api/pipelines/:id/history/:runId  # Returns specific run metrics
```
