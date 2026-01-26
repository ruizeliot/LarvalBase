# External Integrations

**Analysis Date:** 2026-01-26

## APIs & External Services

**Open Broadcaster Software (OBS):**
- OBS WebSocket API - For automated recording of pipeline phases
  - SDK/Client: `obs-websocket-js` v5.0.6
  - Auth: `OBS_PASSWORD` environment variable
  - Usage: `lib/obs-recorder.cjs` connects to OBS at `OBS_HOST` (default ws://localhost:4455)
  - Purpose: Records video of pipeline execution with automatic start/stop on phase changes
  - Recording files: Prefixed with "Pipeline_" in OBS default location

**Model Context Protocol (MCP):**
- Claude MCP Integration - For AI agent integration
  - SDK/Client: `@modelcontextprotocol/sdk` v1.0.0
  - Implementation: `live-canvas-mcp/src/index.ts` - Full MCP server with tools
  - Transport: Stdio (standard input/output for Claude communication)
  - Tools provided:
    - Canvas tools - Whiteboard manipulation
    - Diagram tools - ASCII/Mermaid/PlantUML diagram support
    - Notes tools - Markdown notes persistence
    - Session info - Current session metadata
  - State sharing: Real-time updates via WebSocket broadcast to connected viewers

## Data Storage

**Databases:**
- Not detected - Pipeline-Office is a stateless orchestration system

**File Storage:**
- Local filesystem only
  - Manifest: `.pipeline/manifest.json` (pipeline state)
  - Dashboard scripts: `.pipeline/dashboard.cjs` (per-project copy)
  - Whiteboard data: `.pipeline/whiteboard.json` (canvas state)
  - Notes: `docs/brainstorm-notes.md` (markdown persistence)
  - Persistence: All data read/written synchronously via `fs` module

**Caching:**
- In-memory state during runtime:
  - WebSocket clients connected to viewer
  - Event history in orchestrator
  - Manifest data in memory (with atomic write protection)

## Authentication & Identity

**Auth Provider:**
- OBS-only: Shared secret (WebSocket password)
- No user authentication or identity system
- Project-based access control (via file system permissions)

**Implementation Approach:**
- Single-user local development environment (Windows Terminal foreground)
- No multi-user or remote authentication required
- Process isolation via PID tracking

## Monitoring & Observability

**Error Tracking:**
- Built-in error context (`lib/orchestrator/handlers/error-handler.cjs`)
- Error logging to stderr/stdout
- Structured error objects with stack traces

**Logs:**
- Console output (stderr/stdout via Node.js)
- Animation/state changes logged to dashboard
- Manifest tracks phase duration and cost (for analysis)
- No external log aggregation

## CI/CD & Deployment

**Hosting:**
- Local Windows development machine (C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office)
- Not deployed to cloud - local orchestration only
- Can serve Live Canvas viewer via Express HTTP

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or cloud build system
- Jest tests available for local validation (`npm test`)
- No automated pipeline

## Environment Configuration

**Required env vars:**
- `OBS_PASSWORD` - For OBS integration (optional, recorder requires this)
- `CANVAS_PORT` - Optional, defaults to 3456
- `CANVAS_PROJECT_DIR` - Optional, defaults to cwd
- `CANVAS_AUTO_OPEN` - Optional, defaults to false
- `OBS_HOST` - Optional, defaults to ws://localhost:4455

**Secrets location:**
- Environment variables only
- No `.env` file detected (not committed to git)
- Secrets must be set in shell environment or through PowerShell scripts

## Webhooks & Callbacks

**Incoming:**
- None detected - Pipeline is pull-based (orchestrator polls manifest)

**Outgoing:**
- OBS WebSocket events - Remote command calls (start/stop recording)
- WebSocket broadcasts to connected viewers - Real-time canvas updates
- No external webhook endpoints

## Process Communication

**Inter-Process:**
- Process spawning via PowerShell (`lib/spawn-*.ps1`)
  - Dashboard process spawned in new Windows Terminal window
  - Worker process spawned in separate terminal
  - Supervisor process spawned in separate terminal
- Process monitoring via PID files (`.pipeline/*-pid.txt`)
- Named pipes for Windows Terminal window targeting
- Manifest file as shared state (atomic writes, polling)

**WebSocket Communication:**
- MCP Server (3456) ↔ Live Canvas Viewer (browser)
- Real-time message broadcasting
- Message types: `session_info`, diagram updates, note updates, whiteboard changes

## Node.js Dependencies Graph

```
pipeline-office (v11.0.0)
├── obs-websocket-js (v5.0.6) → OBS WebSocket
└── jest (v29.7.0) → Testing

live-canvas-mcp (v1.0.0)
├── @modelcontextprotocol/sdk (v1.0.0) → Claude MCP
├── express (v4.18.2) → HTTP server
│   ├── ws (v8.16.0) → WebSocket for real-time
│   └── fs/path (built-in) → File I/O
├── open (v10.0.0) → Browser auto-launch
└── [devDeps] tsx, typescript, rimraf

live-canvas-viewer (v1.0.0)
├── react (v18.2.0) → UI framework
├── react-dom (v18.2.0) → DOM rendering
├── @excalidraw/excalidraw (v0.17.0) → Canvas/whiteboard
└── [devDeps] vite, typescript, @vitejs/plugin-react
```

## Architecture Integration Points

**Orchestrator ↔ OBS:**
- `lib/obs-recorder.cjs` maintains persistent connection
- Polls manifest every 1 second for phase changes
- Sends WebSocket commands to OBS when phase transitions
- Separate long-running process from main orchestrator

**Orchestrator ↔ Live Canvas MCP:**
- Not directly integrated - separate services
- Both read/write from project `.pipeline/` and `docs/` directories
- WebSocket allows Claude to see real-time canvas updates

**Dashboard ↔ Orchestrator:**
- Dashboard runs as spawned subprocess
- Reads manifest file for state (no direct API)
- Can receive messages via HTTP endpoint (internal mechanism)

**Worker ↔ Orchestrator:**
- Worker runs as spawned subprocess in separate terminal
- Communicates via TodoWrite updates to todo files
- Orchestrator polls todo files for completion status

---

*Integration audit: 2026-01-26*
