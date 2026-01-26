# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**
- JavaScript (Node.js) - Orchestrator, dashboard, process management (`lib/*.cjs`)
- TypeScript - Live Canvas MCP server, React viewer (`live-canvas-mcp/src/`, `live-canvas-mcp/viewer/src/`)
- PowerShell - Windows Terminal integration, spawn scripts (`*.ps1`)

**Secondary:**
- Rust - Referenced in projects but not core to Pipeline-Office itself
- JSON - Configuration, manifest, state files (`.pipeline/manifest.json`)

## Runtime

**Environment:**
- Node.js v22.19.0+ (specified as >=18.0.0 in package.json)
- Windows Terminal (Windows-specific, ps1 scripts for terminal spawning)
- Web Browser (for Live Canvas viewer)

**Package Manager:**
- npm (primary)
- Lockfiles: `package-lock.json` present in both `live-canvas-mcp/` and `live-canvas-mcp/viewer/`

## Frameworks

**Core:**
- Express.js 4.18.2 - HTTP server for Live Canvas MCP (`live-canvas-mcp/src/server/http.ts`)
- Model Context Protocol (MCP) SDK 1.0.0 - MCP server framework (`live-canvas-mcp/src/index.ts`)

**Frontend/Viewer:**
- React 18.2.0 - UI for Live Canvas viewer (`live-canvas-mcp/viewer/`)
- Vite 5.0.0 - Build tool and dev server for React viewer

**Desktop/Visualization:**
- Excalidraw 0.17.0 - Whiteboard/canvas library for drawing (`live-canvas-mcp/viewer/`)

**Testing:**
- Jest 29.7.0 - Unit test framework (config: `package.json`, matches `**/__tests__/**/*.test.cjs`)

**Build/Dev:**
- TypeScript 5.3.0 - Type checking for MCP and viewer
- tsx 4.7.0 - TypeScript runner for dev mode (`npm run dev`)
- rimraf 5.0.5 - Cross-platform file deletion

## Key Dependencies

**Critical:**
- `@modelcontextprotocol/sdk` 1.0.0 - Enables MCP protocol implementation for Claude integration
- `obs-websocket-js` 5.0.6 - WebSocket client for OBS (Open Broadcaster Software) integration for recording (`lib/obs-recorder.cjs`)

**Infrastructure:**
- `ws` 8.16.0 - WebSocket implementation for real-time canvas updates
- `open` 10.0.0 - Opens URLs in browser (used by live-canvas-mcp for auto-opening viewer)
- `express` 4.18.2 - HTTP server routing

**Type Definitions:**
- `@types/express` 4.17.21 - TypeScript types for Express
- `@types/node` 20.10.0 - TypeScript types for Node.js
- `@types/react` 18.2.0 - React TypeScript definitions
- `@types/react-dom` 18.2.0 - React DOM TypeScript definitions
- `@types/ws` 8.5.10 - WebSocket TypeScript definitions

**Build:**
- `@vitejs/plugin-react` 4.2.0 - React plugin for Vite

## Configuration

**Environment:**
- Controlled via environment variables:
  - `CANVAS_PORT` (default: 3456) - MCP server port
  - `CANVAS_PROJECT_DIR` (default: cwd) - Project directory for canvas persistence
  - `CANVAS_AUTO_OPEN` (default: false) - Auto-open viewer
  - `OBS_HOST` (default: ws://localhost:4455) - OBS WebSocket endpoint
  - `OBS_PASSWORD` - OBS WebSocket authentication

**Build:**
- TypeScript config: `live-canvas-mcp/tsconfig.json` - ES2022 target, ESNext modules, declaration generation
- Vite config: `live-canvas-mcp/viewer/vite.config.ts` - React plugin, proxy to MCP server
- Jest config: `package.json` - CommonJS test environment, matches `**/__tests__/**/*.test.cjs`

## Platform Requirements

**Development:**
- Node.js >=18.0.0 (tested with v22.19.0)
- npm 10.x
- Windows Terminal (for ps1 spawn scripts)
- OBS Studio (optional, for recording integration)
- Git (for version control)

**Production:**
- Node.js >=18.0.0
- Windows OS (Pipeline optimized for Windows with ps1 scripts)
- Can serve Live Canvas viewer via HTTP/WebSocket
- OBS installation not required unless recording is needed

**Browser Requirements (Live Canvas Viewer):**
- Modern browser supporting ES2022 (Chrome, Firefox, Edge, Safari)
- WebSocket support for real-time updates
- Canvas/SVG rendering

---

*Stack analysis: 2026-01-26*
