import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { registerNotesTools, handleNotesTool } from "./tools/notes.js";
import { registerDiagramTools, handleDiagramTool } from "./tools/diagram.js";
import { registerCanvasTools, handleCanvasTool } from "./tools/canvas.js";
import { registerVisualizationTools, handleVisualizationTool } from "./tools/visualizations.js";
import { registerSessionTools, handleSessionTool } from "./tools/session.js";
import { startHttpServer, getHttpServer, canvasState } from "./server/http.js";
import { broadcast, getConnectedClients } from "./server/websocket.js";
import { initSocketIO } from "./server/socketio.js";

const PORT = parseInt(process.env.CANVAS_PORT || "3456");
const PROJECT_DIR = process.env.CANVAS_PROJECT_DIR || process.cwd();
const AUTO_OPEN = process.env.CANVAS_AUTO_OPEN === "true";

// State
export interface CanvasState {
  notes: Map<string, string>; // section -> content
  diagrams: Map<string, { code: string; type: string }>; // id -> diagram
  shapes: Map<string, Shape>; // id -> shape
  projectDir: string;
}

export interface Shape {
  id: string;
  type: "rectangle" | "ellipse" | "text" | "arrow" | "line";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
  fromId?: string; // for connections
  toId?: string;
}

export const state: CanvasState = {
  notes: new Map(),
  diagrams: new Map(),
  shapes: new Map(),
  projectDir: PROJECT_DIR,
};

// Create MCP server
const server = new Server(
  {
    name: "live-canvas-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...registerNotesTools(),
      ...registerDiagramTools(),
      ...registerCanvasTools(),
      ...registerVisualizationTools(),
      ...registerSessionTools(),
      // Session info tool
      {
        name: "get_session",
        description: "Get current Live Canvas session info including connected viewers and active content",
        inputSchema: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Notes tools
  if (name.startsWith("append_notes") || name.startsWith("update_section") || name.startsWith("get_notes")) {
    return handleNotesTool(name, args || {}, state, broadcast);
  }

  // Diagram tools
  if (name.startsWith("render_")) {
    return handleDiagramTool(name, args || {}, state, broadcast);
  }

  // Canvas tools
  if (name.startsWith("create_shape") || name.startsWith("update_shape") || name.startsWith("delete_shape") || name.startsWith("connect_shapes") || name.startsWith("clear_canvas")) {
    return handleCanvasTool(name, args || {}, state, broadcast);
  }

  // Visualization tools (high-level diagram generation)
  if (name === "create_mindmap" || name === "create_flow" || name === "create_matrix" || name === "create_affinity_diagram") {
    return handleVisualizationTool(name, args || {}, state, broadcast);
  }

  // Session phase tool
  if (name === "get_session_phase") {
    return handleSessionTool(name);
  }

  // Session info
  if (name === "get_session") {
    const clientCount = getConnectedClients();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            connected: clientCount > 0,
            viewerCount: clientCount,
            viewerUrl: `http://localhost:${PORT}`,
            notesSections: Array.from(state.notes.keys()),
            diagramCount: state.diagrams.size,
            shapeCount: state.shapes.size,
          }, null, 2),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
});

// Start server
async function main() {
  // Start HTTP + WebSocket server for viewer
  await startHttpServer(PORT, AUTO_OPEN);

  // Initialize Socket.IO for multi-user rooms
  const httpServer = getHttpServer();
  if (httpServer) {
    initSocketIO(httpServer, () => canvasState, PORT);
    console.error(`[Socket.IO] Room server initialized`);
  } else {
    console.error(`[Socket.IO] Warning: HTTP server not available, rooms disabled`);
  }

  // Start MCP server on stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Live Canvas MCP server running`);
  console.error(`Viewer available at: http://localhost:${PORT}`);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
