import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { initWebSocket, broadcast, getConnectedClients, setMessageHandler } from "./websocket.js";
import { setClaudePid, getClaudePid, injectInteractiveInput, injectMessage } from "./inject.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Shared state for HTTP API and WebSocket
export const canvasState = {
  notes: "" as string, // Full markdown content
  objects: [] as CanvasObject[], // Whiteboard objects (for legacy Fabric.js viewer)
  projectDir: process.cwd(), // Project directory for file sync
};

export interface CanvasObject {
  id: string;
  type: "rect" | "circle" | "text" | "line" | "arrow" | "path";
  left: number;
  top: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[]; // For lines/arrows
  path?: string; // For freehand drawing
  fontSize?: number;
}

let objectCounter = 0;

// Notes file path (relative to project)
function getNotesFilePath(): string {
  const docsDir = join(canvasState.projectDir, "docs");
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }
  return join(docsDir, "brainstorm-notes.md");
}

// Load notes from file
function loadNotesFromFile(): string {
  const filePath = getNotesFilePath();
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf-8");
  }
  return "";
}

// Save notes to file
function saveNotesToFile(content: string): void {
  const filePath = getNotesFilePath();
  writeFileSync(filePath, content, "utf-8");
}

// Debounced file save
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveNotes(content: string, delay = 500): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    saveNotesToFile(content);
    saveDebounceTimer = null;
  }, delay);
}

// Save whiteboard image to file
function saveWhiteboardImage(base64Data: string): string {
  const pipelineDir = join(canvasState.projectDir, ".pipeline");
  if (!existsSync(pipelineDir)) {
    mkdirSync(pipelineDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `whiteboard-${timestamp}.png`;
  const filePath = join(pipelineDir, filename);

  // Remove data URL prefix if present
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Content, "base64");
  writeFileSync(filePath, buffer);

  return filePath;
}

export async function startHttpServer(port: number, autoOpen: boolean): Promise<void> {
  const app = express();
  const server = createServer(app);

  // Parse JSON bodies (larger limit for base64 images)
  app.use(express.json({ limit: '50mb' }));

  // Initialize WebSocket on same server
  initWebSocket(server);

  // Load initial notes from file
  canvasState.notes = loadNotesFromFile();

  // Handle messages from viewer (user edits)
  setMessageHandler((msg: Record<string, unknown>) => {
    if (msg.type === "notes_edit") {
      // User edited notes
      canvasState.notes = msg.content as string;
      // Save to file (debounced)
      debouncedSaveNotes(canvasState.notes);
      // Broadcast to other viewers (not back to sender)
      broadcast({ type: "notes_sync", content: msg.content, fromUser: true });
    } else if (msg.type === "user_input") {
      // New unified input from React viewer (with optional whiteboard and notes)
      const payload: Record<string, unknown> = {
        type: "user_input",
        message: msg.message,
        timestamp: new Date().toISOString(),
      };

      // Save whiteboard image if included
      let whiteboardPath: string | undefined;
      if (msg.whiteboard && typeof msg.whiteboard === 'string') {
        whiteboardPath = saveWhiteboardImage(msg.whiteboard);
        payload.whiteboardPath = whiteboardPath;
      }

      // Include notes if present
      if (msg.notes) {
        payload.notes = msg.notes;
      }

      // Log for debugging
      console.error(`[USER INPUT] ${JSON.stringify(payload)}`);

      // Broadcast to all viewers
      broadcast(payload);

      // Inject into Claude TUI if PID is set
      const claudePid = getClaudePid();
      if (claudePid) {
        injectInteractiveInput({
          message: msg.message as string,
          whiteboardPath,
          notes: msg.notes as string | undefined,
        }).then((result) => {
          if (result.success) {
            console.error(`[USER INPUT] Injected to Claude PID ${claudePid}`);
          } else {
            console.error(`[USER INPUT] Injection failed: ${result.error}`);
          }
          // Notify viewer of injection status
          broadcast({
            type: "injection_status",
            success: result.success,
            error: result.error,
          });
        });
      } else {
        console.error(`[USER INPUT] No Claude PID set - message not injected`);
        broadcast({
          type: "injection_status",
          success: false,
          error: "Claude PID not set. Use /api/inject/pid to set it.",
        });
      }
    } else if (msg.type === "canvas_object_add") {
      // User added object on canvas (legacy Fabric.js)
      const msgObject = msg.object as Record<string, unknown>;
      const obj = {
        ...msgObject,
        id: (msgObject.id as string) || `user-${++objectCounter}`
      } as CanvasObject;
      canvasState.objects.push(obj);
      broadcast({ type: "canvas_object_added", object: obj, fromUser: true });
    } else if (msg.type === "canvas_object_modify") {
      // User modified object
      const msgObject = msg.object as Record<string, unknown>;
      const idx = canvasState.objects.findIndex(o => o.id === msgObject.id);
      if (idx >= 0) {
        canvasState.objects[idx] = { ...canvasState.objects[idx], ...msgObject } as CanvasObject;
        broadcast({ type: "canvas_object_modified", object: canvasState.objects[idx], fromUser: true });
      }
    } else if (msg.type === "canvas_object_delete") {
      // User deleted object
      canvasState.objects = canvasState.objects.filter(o => o.id !== msg.id);
      broadcast({ type: "canvas_object_deleted", id: msg.id, fromUser: true });
    } else if (msg.type === "canvas_sync") {
      // User sends full canvas state
      canvasState.objects = (msg.objects as CanvasObject[]) || [];
    }
  });

  // Serve static viewer files (React build)
  const viewerPath = join(__dirname, "../../viewer/dist");
  if (existsSync(viewerPath)) {
    app.use(express.static(viewerPath));
  }

  // ============ HTTP API ENDPOINTS ============

  // POST /api/notes - Set notes content (AI writes)
  app.post("/api/notes", (req, res) => {
    const { content, append = false } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: "content required" });
    }

    if (append) {
      canvasState.notes += "\n" + content;
    } else {
      canvasState.notes = content;
    }

    // Save to file
    saveNotesToFile(canvasState.notes);

    // Broadcast to viewers
    broadcast({
      type: "notes_sync",
      content: canvasState.notes,
      fromAI: true,
    });

    res.json({ success: true, length: canvasState.notes.length });
  });

  // GET /api/notes - Get current notes
  app.get("/api/notes", (req, res) => {
    res.json({ content: canvasState.notes });
  });

  // POST /api/notes/reload - Reload notes from file
  app.post("/api/notes/reload", (req, res) => {
    canvasState.notes = loadNotesFromFile();
    broadcast({ type: "notes_sync", content: canvasState.notes, fromAI: true });
    res.json({ success: true, length: canvasState.notes.length });
  });

  // POST /api/canvas/add - Add object to whiteboard (AI draws)
  app.post("/api/canvas/add", (req, res) => {
    const { type, left, top, width, height, radius, text, fill, stroke, strokeWidth, points, fontSize } = req.body;

    if (!type || left === undefined || top === undefined) {
      return res.status(400).json({ error: "type, left, top required" });
    }

    const obj: CanvasObject = {
      id: `ai-${++objectCounter}`,
      type,
      left,
      top,
      width,
      height,
      radius,
      text,
      fill: fill || "transparent",
      stroke: stroke || "#3b82f6",
      strokeWidth: strokeWidth || 2,
      points,
      fontSize: fontSize || 16,
    };

    canvasState.objects.push(obj);

    // Broadcast to viewers
    broadcast({
      type: "canvas_object_added",
      object: obj,
      fromAI: true,
    });

    res.json({ success: true, id: obj.id });
  });

  // POST /api/canvas/text - Add text to whiteboard (convenience)
  app.post("/api/canvas/text", (req, res) => {
    const { text, left, top, fontSize = 16, fill = "#e2e8f0" } = req.body;

    if (!text || left === undefined || top === undefined) {
      return res.status(400).json({ error: "text, left, top required" });
    }

    const obj: CanvasObject = {
      id: `ai-${++objectCounter}`,
      type: "text",
      left,
      top,
      text,
      fill,
      fontSize,
    };

    canvasState.objects.push(obj);
    broadcast({ type: "canvas_object_added", object: obj, fromAI: true });

    res.json({ success: true, id: obj.id });
  });

  // POST /api/canvas/rect - Add rectangle (convenience)
  app.post("/api/canvas/rect", (req, res) => {
    const { left, top, width = 100, height = 60, fill = "transparent", stroke = "#3b82f6", label } = req.body;

    if (left === undefined || top === undefined) {
      return res.status(400).json({ error: "left, top required" });
    }

    const rectObj: CanvasObject = {
      id: `ai-${++objectCounter}`,
      type: "rect",
      left,
      top,
      width,
      height,
      fill,
      stroke,
      strokeWidth: 2,
    };

    canvasState.objects.push(rectObj);
    broadcast({ type: "canvas_object_added", object: rectObj, fromAI: true });

    // Add label if provided
    if (label) {
      const textObj: CanvasObject = {
        id: `ai-${++objectCounter}`,
        type: "text",
        left: left + 10,
        top: top + height / 2 - 8,
        text: label,
        fill: "#e2e8f0",
        fontSize: 14,
      };
      canvasState.objects.push(textObj);
      broadcast({ type: "canvas_object_added", object: textObj, fromAI: true });
    }

    res.json({ success: true, id: rectObj.id });
  });

  // POST /api/canvas/arrow - Add arrow between points
  app.post("/api/canvas/arrow", (req, res) => {
    const { x1, y1, x2, y2, stroke = "#3b82f6" } = req.body;

    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
      return res.status(400).json({ error: "x1, y1, x2, y2 required" });
    }

    const obj: CanvasObject = {
      id: `ai-${++objectCounter}`,
      type: "arrow",
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      points: [x1, y1, x2, y2],
      stroke,
      strokeWidth: 2,
    };

    canvasState.objects.push(obj);
    broadcast({ type: "canvas_object_added", object: obj, fromAI: true });

    res.json({ success: true, id: obj.id });
  });

  // POST /api/canvas/clear - Clear whiteboard
  app.post("/api/canvas/clear", (req, res) => {
    canvasState.objects = [];
    broadcast({ type: "canvas_clear", fromAI: true });
    res.json({ success: true });
  });

  // GET /api/canvas - Get current canvas state
  app.get("/api/canvas", (req, res) => {
    res.json({ objects: canvasState.objects });
  });

  // GET /api/status - Check server and viewer status
  app.get("/api/status", (req, res) => {
    res.json({
      status: "ok",
      viewers: getConnectedClients(),
      notesLength: canvasState.notes.length,
      objectCount: canvasState.objects.length,
      projectDir: canvasState.projectDir,
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/project - Set project directory
  app.post("/api/project", (req, res) => {
    const { projectDir } = req.body;
    if (projectDir) {
      canvasState.projectDir = projectDir;
      canvasState.notes = loadNotesFromFile();
      broadcast({ type: "notes_sync", content: canvasState.notes, fromAI: true });
      res.json({ success: true, projectDir: canvasState.projectDir });
    } else {
      res.status(400).json({ error: "projectDir required" });
    }
  });

  // ============ INJECTION API ============

  // POST /api/inject/pid - Set Claude PID for injection
  app.post("/api/inject/pid", (req, res) => {
    const { pid } = req.body;
    if (pid && typeof pid === "number") {
      setClaudePid(pid);
      res.json({ success: true, pid });
    } else {
      res.status(400).json({ error: "pid (number) required" });
    }
  });

  // GET /api/inject/pid - Get current Claude PID
  app.get("/api/inject/pid", (req, res) => {
    const pid = getClaudePid();
    res.json({ pid, isSet: pid !== null });
  });

  // POST /api/inject - Inject a message into Claude
  app.post("/api/inject", async (req, res) => {
    const { message, whiteboardPath, notes, noEnter, interrupt } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message required" });
    }

    const result = await injectInteractiveInput({
      message,
      whiteboardPath,
      notes,
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  });

  // POST /api/inject/raw - Inject raw text (no formatting)
  app.post("/api/inject/raw", async (req, res) => {
    const { message, noEnter, interrupt } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message required" });
    }

    const result = await injectMessage(message, { noEnter, interrupt });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  });

  // ============ END HTTP API ============

  // Serve React viewer index.html for SPA routing
  app.get("*", (req, res) => {
    const indexPath = join(viewerPath, "index.html");
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback to inline viewer
      res.send(getInlineViewer());
    }
  });

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.error(`[HTTP] Server listening on http://localhost:${port}`);

      if (autoOpen) {
        import("open").then((open) => {
          open.default(`http://localhost:${port}`);
        });
      }

      resolve();
    });
  });
}

function getInlineViewer(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Canvas - Build Required</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .message {
      text-align: center;
      max-width: 500px;
      padding: 2rem;
    }
    h1 { color: #3b82f6; margin-bottom: 1rem; }
    code {
      background: #1e293b;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: block;
      margin: 1rem 0;
    }
  </style>
</head>
<body>
  <div class="message">
    <h1>Live Canvas Viewer Not Built</h1>
    <p>The React viewer needs to be built first.</p>
    <code>cd live-canvas-mcp/viewer && npm install && npm run build</code>
    <p>Then restart the MCP server.</p>
  </div>
</body>
</html>`;
}
