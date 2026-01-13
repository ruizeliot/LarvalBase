# Live Canvas: Real-Time Visualization for Interactive Sessions

**Created:** 2026-01-12
**Status:** Design Complete, Implementation Pending
**Branch:** `feature/live-canvas`

---

## 1. Overview

Live Canvas is a **real-time visualization system** that updates as an agent and user discuss ideas. It's designed to be **pluggable** into any interactive session, not just brainstorming.

### 1.1 Use Cases

| Context | What Gets Visualized |
|---------|---------------------|
| **Brainstorming** | Ideas, features, notes (progressive markdown) |
| **UI Design** | Mockups, wireframes, layouts (canvas drawing) |
| **Architecture** | System diagrams, data flow (Mermaid/PlantUML) |
| **User Flows** | Storyboards, journey maps (flowcharts) |
| **Data Models** | ER diagrams, schemas (structured diagrams) |

### 1.2 Key Principles

1. **Progressive output** - Content appears as discussed, not dumped at end
2. **Pluggable** - Works with any interactive session
3. **Multi-format** - Supports markdown, Mermaid, canvas drawing, ASCII
4. **Persistent** - All content saved to files (survives session end)
5. **Optional** - Works without Live Canvas (falls back to file-only mode)

---

## 2. Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTERACTIVE SESSION                              │
│              (Agent + User in Claude Code conversation)              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Agent calls MCP tools
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MCP SERVER: live-canvas-mcp                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Notes      │  │   Diagram    │  │   Canvas     │               │
│  │   Tools      │  │   Tools      │  │   Tools      │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  • append_notes     • render_mermaid   • create_shape               │
│  • update_section   • render_plantuml  • update_shape               │
│  • get_notes        • get_diagram      • connect_shapes             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │ File System │    │  WebSocket  │    │   HTTP      │
    │ (persist)   │    │  (live)     │    │   (static)  │
    └─────────────┘    └─────────────┘    └─────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     LIVE VIEWER (Web App)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   Notes Panel   │  │  Diagram Panel  │  │  Canvas Panel   │      │
│  │   (Markdown)    │  │  (Mermaid/UML)  │  │  (Excalidraw)   │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                      │
│  Auto-scrolls to new content • Responsive layout • Theme support     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **MCP Server** | Receives tool calls, updates state, broadcasts changes, persists to files |
| **File System** | Persistent storage (survives crashes, enables resume) |
| **WebSocket** | Real-time updates to viewer |
| **HTTP Server** | Serves viewer app, static assets |
| **Live Viewer** | Renders content in browser with auto-refresh |

---

## 3. MCP Server Specification

### 3.1 Server Configuration

```json
{
  "mcpServers": {
    "live-canvas": {
      "command": "node",
      "args": ["path/to/live-canvas-mcp/dist/index.js"],
      "env": {
        "CANVAS_PORT": "3456",
        "CANVAS_PROJECT_DIR": "${projectDir}",
        "CANVAS_AUTO_OPEN": "true"
      }
    }
  }
}
```

### 3.2 Tools: Notes

#### `append_notes`

Appends content to a section in the notes file. Creates section if doesn't exist.

```typescript
interface AppendNotesInput {
  section: string;      // Section header (e.g., "Features", "Technical Notes")
  content: string;      // Markdown content to append
  file?: string;        // Default: "docs/brainstorm-notes.md"
}

interface AppendNotesOutput {
  success: boolean;
  lineCount: number;    // Lines added
  totalLines: number;   // Total lines in file
}

// Example
{
  section: "Features",
  content: "- Kanban board interface\n- Drag-and-drop cards"
}
```

#### `update_section`

Replaces entire section content (for refinement/reorganization).

```typescript
interface UpdateSectionInput {
  section: string;
  content: string;
  file?: string;
}
```

#### `get_notes`

Retrieves current notes content (for resumability).

```typescript
interface GetNotesInput {
  file?: string;
  section?: string;     // Optional: get specific section only
}

interface GetNotesOutput {
  content: string;
  sections: string[];   // List of section names
  lastModified: string; // ISO timestamp
}
```

### 3.3 Tools: Diagrams

#### `render_mermaid`

Renders Mermaid diagram and sends to viewer.

```typescript
interface RenderMermaidInput {
  diagram: string;      // Mermaid diagram code
  id?: string;          // Diagram ID (for updates). Default: auto-generated
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

interface RenderMermaidOutput {
  success: boolean;
  id: string;
  svg?: string;         // SVG content (if requested)
  url?: string;         // URL to view diagram
}

// Example
{
  diagram: `flowchart LR
    A[User] --> B[Login]
    B --> C{Valid?}
    C -->|Yes| D[Dashboard]
    C -->|No| E[Error]`,
  id: "auth-flow",
  theme: "default"
}
```

#### `render_plantuml`

Renders PlantUML diagram.

```typescript
interface RenderPlantUMLInput {
  diagram: string;      // PlantUML code (with @startuml/@enduml)
  id?: string;
  format?: 'svg' | 'png';
}
```

#### `render_ascii`

Renders ASCII art diagram (for terminal/markdown compatibility).

```typescript
interface RenderAsciiInput {
  diagram: string;      // ASCII diagram
  id?: string;
  type?: 'box' | 'flow' | 'tree' | 'table';
}
```

### 3.4 Tools: Canvas (Freeform Drawing)

#### `create_shape`

Creates a shape on the canvas.

```typescript
interface CreateShapeInput {
  type: 'rectangle' | 'ellipse' | 'text' | 'arrow' | 'line' | 'frame';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontSize?: number;
  };
}

interface CreateShapeOutput {
  success: boolean;
  id: string;           // Shape ID for updates
}
```

#### `update_shape`

Updates existing shape properties.

```typescript
interface UpdateShapeInput {
  id: string;
  properties: Partial<CreateShapeInput>;
}
```

#### `connect_shapes`

Creates arrow/line between shapes.

```typescript
interface ConnectShapesInput {
  from: string;         // Shape ID
  to: string;           // Shape ID
  label?: string;
  style?: 'arrow' | 'line' | 'dashed';
}
```

#### `create_mockup`

High-level tool for UI mockups (creates multiple shapes).

```typescript
interface CreateMockupInput {
  type: 'window' | 'mobile' | 'component';
  elements: Array<{
    type: 'header' | 'sidebar' | 'button' | 'input' | 'list' | 'card';
    label?: string;
    position?: { x: number; y: number };
  }>;
}
```

### 3.5 Tools: Session Management

#### `get_session`

Gets current session state.

```typescript
interface GetSessionOutput {
  active: boolean;
  viewerConnected: boolean;
  viewerUrl: string;
  files: string[];
  diagrams: string[];   // Diagram IDs
  shapes: string[];     // Shape IDs
}
```

#### `clear_canvas`

Clears canvas (for starting fresh mockup).

```typescript
interface ClearCanvasInput {
  confirm: boolean;     // Must be true
  keepFiles?: boolean;  // Default: true (keeps notes files)
}
```

#### `export_canvas`

Exports current canvas state.

```typescript
interface ExportCanvasInput {
  format: 'png' | 'svg' | 'json';
  path?: string;        // Default: docs/canvas-export.[format]
}
```

---

## 4. Live Viewer Specification

### 4.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Framework** | React or Svelte | Component-based, fast |
| **Markdown** | react-markdown + remark-gfm | GFM support |
| **Mermaid** | mermaid.js | Official library |
| **Canvas** | Excalidraw or tldraw | Mature, embeddable |
| **WebSocket** | Native WebSocket | Simple, universal |
| **Bundler** | Vite | Fast dev, good DX |

### 4.2 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Live Canvas - TaskFlow Brainstorm                    [Theme] [⛶]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐   │
│  │                     │  │                                     │   │
│  │   NOTES             │  │   DIAGRAM / CANVAS                  │   │
│  │   (Markdown)        │  │   (Mermaid or Excalidraw)           │   │
│  │                     │  │                                     │   │
│  │   ## Core Concept   │  │   ┌─────┐      ┌─────┐              │   │
│  │   - Task manager    │  │   │User │ ──── │Login│              │   │
│  │                     │  │   └─────┘      └─────┘              │   │
│  │   ## Features       │  │        │                            │   │
│  │   - Kanban board    │  │        ▼                            │   │
│  │   - Due dates       │  │   ┌─────────┐                       │   │
│  │   - Priority        │  │   │Dashboard│                       │   │
│  │                     │  │   └─────────┘                       │   │
│  │   ## Integrations   │  │                                     │   │
│  │   - Google Cal      │  │                                     │   │
│  │                     │  │                                     │   │
│  │   [auto-scroll ↓]   │  │                                     │   │
│  └─────────────────────┘  └─────────────────────────────────────┘   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Status: Connected ● │ Notes: 45 lines │ Diagrams: 2 │ Shapes: 8   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Features

| Feature | Description |
|---------|-------------|
| **Auto-scroll** | Notes panel scrolls to show new content |
| **Split view** | Resizable panels (notes + diagram/canvas) |
| **Theme toggle** | Light/dark mode |
| **Full-screen** | Expand any panel to full screen |
| **Export** | Download notes as MD, diagram as SVG/PNG |
| **Connection indicator** | Shows WebSocket status |
| **History** | View previous diagram versions |

### 4.4 WebSocket Protocol

```typescript
// Server → Viewer messages
interface ServerMessage {
  type: 'notes_update' | 'diagram_update' | 'canvas_update' | 'session_info';
  payload: any;
}

// notes_update payload
interface NotesUpdatePayload {
  action: 'append' | 'replace' | 'full';
  section?: string;
  content: string;
  file: string;
}

// diagram_update payload
interface DiagramUpdatePayload {
  id: string;
  type: 'mermaid' | 'plantuml' | 'ascii';
  code: string;
  svg?: string;
}

// canvas_update payload
interface CanvasUpdatePayload {
  action: 'create' | 'update' | 'delete' | 'clear';
  shapes?: Shape[];
  connections?: Connection[];
}
```

---

## 5. Skill Integration

### 5.1 Skill: `live-brainstorm`

Enhanced brainstorm skill that uses Live Canvas.

```markdown
# Skill: live-brainstorm

## Description
Interactive brainstorming with live visualization. Updates canvas in real-time
as ideas are discussed.

## MCP Requirements
- live-canvas-mcp (required)

## Rules

### Rule 1: Write Immediately
After EVERY user message containing an idea:
1. Call `append_notes` with the idea
2. THEN continue conversation

### Rule 2: Visualize Progressively
When discussing:
- User flows → Update Mermaid flowchart
- UI layouts → Update canvas mockup
- Architecture → Update system diagram
- Data models → Update ER diagram

### Rule 3: Announce Visualizations
Before creating/updating visuals, tell the user:
"I'm adding this to the live canvas..."

### Rule 4: Summarize Before Moving On
Before changing topics, ensure current topic is:
1. Written to notes
2. Visualized (if applicable)
3. Confirmed with user
```

### 5.2 Detection Logic

The skill detects what to visualize based on conversation context:

```typescript
interface VisualizationDetector {
  // Returns suggested visualization type
  detect(message: string, context: ConversationContext): VisualizationType | null;
}

type VisualizationType =
  | { type: 'mermaid'; subtype: 'flowchart' | 'sequence' | 'er' | 'class' }
  | { type: 'canvas'; subtype: 'mockup' | 'wireframe' | 'diagram' }
  | { type: 'ascii'; subtype: 'box' | 'tree' | 'table' }
  | { type: 'notes'; subtype: 'bullet' | 'section' };

// Detection patterns
const patterns = {
  flowchart: /user flow|process|steps|workflow|journey/i,
  mockup: /ui|layout|screen|interface|design|mockup|wireframe/i,
  er: /data model|schema|entities|relationships|database/i,
  sequence: /api|request|response|interaction|call/i,
  architecture: /system|components|services|architecture/i,
};
```

---

## 6. Existing MCP Servers to Leverage

Based on research, we can leverage existing MCP servers instead of building everything:

### 6.1 Recommended Stack

| Function | MCP Server | Why |
|----------|-----------|-----|
| **Notes** | [mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) | Has `append_content`, `patch_content` |
| **Mermaid** | [claude-mermaid](https://github.com/veelenga/claude-mermaid) | Live reload, built-in skill |
| **Canvas** | [mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) | Full feature set, WebSocket |
| **PlantUML** | [plantuml-mcp-server](https://github.com/infobip/plantuml-mcp-server) | Auto-fix syntax |

### 6.2 Alternative: Unified Custom Server

Build a single `live-canvas-mcp` that:
- Wraps/integrates the above
- Provides unified interface
- Manages the viewer app
- Handles file persistence

### 6.3 Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Use existing** | Fast to implement, battle-tested | Multiple MCPs to configure, inconsistent APIs |
| **Unified custom** | Single config, consistent API, custom viewer | More work, maintenance burden |
| **Hybrid** | Best of both | Complexity |

**Recommendation:** Start with existing MCPs (claude-mermaid + mcp-obsidian), add custom viewer later.

---

## 7. Implementation Phases

### Phase 1: Minimal Viable (Use Existing)

1. Configure `claude-mermaid` for live diagrams
2. Configure `mcp-obsidian` for notes persistence
3. Create `live-brainstorm` skill that uses both
4. Use claude-mermaid's built-in viewer

**Effort:** 1-2 days
**Result:** Live Mermaid + persistent notes

### Phase 2: Custom Viewer

1. Build React/Svelte viewer app
2. Add notes panel (watches file with chokidar)
3. Integrate Mermaid rendering
4. Add WebSocket for real-time updates

**Effort:** 3-5 days
**Result:** Unified viewer with notes + diagrams

### Phase 3: Canvas Support

1. Integrate Excalidraw component
2. Add canvas tools to MCP (or use mcp_excalidraw)
3. Add mockup generation capability

**Effort:** 3-5 days
**Result:** Full canvas support for UI mockups

### Phase 4: Polish

1. Session management (resume, export)
2. Multiple diagram support
3. History/versioning
4. Theme customization

**Effort:** 2-3 days
**Result:** Production-ready system

---

## 8. File Structure

```
live-canvas-mcp/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── tools/
│   │   ├── notes.ts          # Notes tools
│   │   ├── diagram.ts        # Diagram tools
│   │   └── canvas.ts         # Canvas tools
│   ├── viewer/
│   │   ├── server.ts         # HTTP + WebSocket server
│   │   └── broadcast.ts      # WebSocket broadcast
│   └── persistence/
│       └── files.ts          # File read/write
├── viewer/                    # React/Svelte app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── NotesPanel.tsx
│   │   │   ├── DiagramPanel.tsx
│   │   │   └── CanvasPanel.tsx
│   │   └── hooks/
│   │       └── useWebSocket.ts
│   └── package.json
├── package.json
└── README.md
```

---

## 9. Configuration

### 9.1 Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "live-canvas": {
      "command": "node",
      "args": ["/path/to/live-canvas-mcp/dist/index.js"],
      "env": {
        "CANVAS_PORT": "3456",
        "CANVAS_PROJECT_DIR": ".",
        "CANVAS_AUTO_OPEN": "true",
        "CANVAS_THEME": "dark"
      }
    }
  }
}
```

### 9.2 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CANVAS_PORT` | `3456` | HTTP/WebSocket server port |
| `CANVAS_PROJECT_DIR` | `.` | Project directory for file persistence |
| `CANVAS_AUTO_OPEN` | `true` | Auto-open viewer in browser |
| `CANVAS_THEME` | `light` | Default theme (light/dark) |
| `CANVAS_NOTES_FILE` | `docs/brainstorm-notes.md` | Default notes file |

---

## 10. Usage Examples

### 10.1 Brainstorming Session

```
User: /brainstorm

Agent: Starting brainstorm session with Live Canvas...
       [Opens http://localhost:3456 in browser]

       What kind of app are you thinking of building?

User: A task manager with kanban boards

Agent: [Calls append_notes: section="Core Concept", content="- Task manager with kanban boards"]

       Great! I've added that to the notes. Let me sketch a basic layout...

       [Calls render_mermaid with UI flow diagram]

       I'm showing a basic user flow in the canvas. What features are essential?

User: Due dates, priorities, and maybe labels

Agent: [Calls append_notes: section="Features", content="- Due dates\n- Priorities\n- Labels/tags"]

       Added to features. Should tasks have subtasks or keep it flat?

[Session continues, notes and diagrams update in real-time]
```

### 10.2 UI Mockup Session

```
User: Let's design the main dashboard

Agent: [Calls create_mockup with dashboard template]

       I've created a basic dashboard layout in the canvas:
       - Header with search and user menu
       - Sidebar with board list
       - Main area with kanban columns

       What would you like to adjust?

User: Make the sidebar collapsible and add a dark mode toggle

Agent: [Calls update_shape for sidebar]
       [Calls create_shape for dark mode toggle]

       Updated! The sidebar now has a collapse button, and I added
       a theme toggle in the header.
```

---

## 11. Related Documents

- [25-phase-1-redesign.md](./25-phase-1-redesign.md) - Phase 1 as pre-pipeline activity
- [09-phase-1-discovery-planning.md](./09-phase-1-discovery-planning.md) - Legacy Phase 1 (deprecated)

---

## 12. Research Sources

### MCP Servers Referenced

- [claude-mermaid](https://github.com/veelenga/claude-mermaid) - Live reload Mermaid
- [mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) - Full Excalidraw integration
- [mcp-obsidian](https://github.com/MarkusPfundstein/mcp-obsidian) - Markdown notes
- [Prompt2Sketch](https://github.com/Arsenic-01/Prompt2Sketch) - tldraw + MCP
- [tldraw Agent Starter Kit](https://tldraw.dev/starter-kits/agent) - Official AI integration
- [plantuml-mcp-server](https://github.com/infobip/plantuml-mcp-server) - PlantUML with auto-fix
- [mcp-miro](https://github.com/evalstate/mcp-miro) - Miro whiteboard
- [Sailor](https://github.com/aj-geddes/sailor) - FastMCP Mermaid

### Technologies

- [Yjs](https://yjs.dev/) - CRDT for real-time collaboration
- [chokidar](https://github.com/paulmillr/chokidar) - File watching
- [Excalidraw](https://excalidraw.com/) - Freeform canvas
- [tldraw](https://tldraw.dev/) - Infinite canvas SDK

---

## 13. Open Questions

1. **Single vs multiple MCPs?** - Use existing MCPs or build unified?
2. **Viewer hosting** - Embedded in MCP or separate process?
3. **Collaboration** - Support multiple viewers (for screen sharing)?
4. **Offline** - Work without viewer open (file-only mode)?
5. **Mobile** - Responsive viewer for mobile devices?
