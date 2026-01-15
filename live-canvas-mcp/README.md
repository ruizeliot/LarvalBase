# Live Canvas MCP

Real-time brainstorming visualization MCP server for Claude Code.

## Features

- **Notes Tools**: Append and update brainstorm notes with live persistence
- **Diagram Tools**: Render Mermaid, PlantUML, and ASCII diagrams
- **Canvas Tools**: Create and manipulate shapes for visual brainstorming
- **Live Viewer**: Browser-based real-time preview via WebSocket

## Installation

```bash
cd live-canvas-mcp
npm install
npm run build
```

## Configuration

Add to your `.mcp.json` or Claude Code MCP settings:

```json
{
  "mcpServers": {
    "live-canvas": {
      "command": "node",
      "args": ["C:/Users/ahunt/Documents/IMT Claude/live-canvas-mcp/dist/index.js"],
      "env": {
        "CANVAS_PORT": "3456",
        "CANVAS_PROJECT_DIR": ".",
        "CANVAS_AUTO_OPEN": "true"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CANVAS_PORT` | `3456` | HTTP/WebSocket server port |
| `CANVAS_PROJECT_DIR` | Current directory | Base path for file operations |
| `CANVAS_AUTO_OPEN` | `false` | Auto-open viewer in browser |

## Available Tools

### Notes Tools

| Tool | Description |
|------|-------------|
| `append_notes` | Append content to a section in brainstorm notes |
| `update_section` | Replace entire section content |
| `get_notes` | Get current notes content |

### Diagram Tools

| Tool | Description |
|------|-------------|
| `render_mermaid` | Render Mermaid diagram (flowchart, sequence, etc.) |
| `render_ascii` | Display ASCII art with monospace formatting |
| `render_plantuml` | Render PlantUML diagram |

### Canvas Tools

| Tool | Description |
|------|-------------|
| `create_shape` | Create rectangle, ellipse, text, arrow, or line |
| `update_shape` | Modify existing shape properties |
| `delete_shape` | Remove shape from canvas |
| `connect_shapes` | Draw connection between two shapes |
| `clear_canvas` | Clear all shapes |

### Session Tools

| Tool | Description |
|------|-------------|
| `get_session` | Get session info (connected viewers, content stats) |

## Usage Example

During a brainstorm session:

```
// Check if viewer is connected
get_session()

// Add ideas as they come up
append_notes({ section: "Features", content: "- Dark mode support" })
append_notes({ section: "Features", content: "- Keyboard shortcuts" })

// Show a diagram
render_mermaid({
  diagram: "flowchart TD\n  A[User] --> B[App]\n  B --> C[Database]",
  title: "System Architecture"
})

// Create visual shapes
create_shape({ type: "rectangle", x: 100, y: 100, width: 150, height: 80, text: "Frontend" })
create_shape({ type: "rectangle", x: 300, y: 100, width: 150, height: 80, text: "Backend" })
connect_shapes({ fromId: "shape-1", toId: "shape-2" })
```

## Viewer

Open `http://localhost:3456` in a browser to see live updates.

The viewer includes:
- **Notes Panel**: Markdown-rendered brainstorm notes
- **Diagrams Panel**: Mermaid/ASCII diagrams with live updates
- **Connection Status**: Real-time WebSocket connection indicator

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build for production
npm run build

# Start server
npm start
```

## WebSocket Protocol

Messages from server to viewer:

```typescript
// Notes update
{ type: "notes_update", section: string, content: string, action: "append" | "replace" }

// Diagram update
{ type: "diagram_update", id: string, diagramType: string, code: string, title?: string }

// Canvas update
{ type: "canvas_update", action: "create" | "update" | "delete" | "connect" | "clear", shape?: Shape }

// Session info
{ type: "session_info", message: string, timestamp: string }
```

## License

MIT
