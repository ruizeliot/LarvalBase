import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initWebSocket, broadcast, getConnectedClients, setMessageHandler } from "./websocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Shared state for HTTP API and WebSocket
export const canvasState = {
  notes: "" as string, // Full markdown content
  objects: [] as CanvasObject[], // Whiteboard objects
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

export async function startHttpServer(port: number, autoOpen: boolean): Promise<void> {
  const app = express();
  const server = createServer(app);

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Initialize WebSocket on same server
  initWebSocket(server);

  // Handle messages from viewer (user edits)
  setMessageHandler((msg: any) => {
    if (msg.type === "notes_edit") {
      // User edited notes
      canvasState.notes = msg.content;
      // Broadcast to other viewers (not back to sender)
      broadcast({ type: "notes_sync", content: msg.content, fromUser: true });
    } else if (msg.type === "canvas_object_add") {
      // User added object on canvas
      const obj = { ...msg.object, id: msg.object.id || `user-${++objectCounter}` };
      canvasState.objects.push(obj);
      broadcast({ type: "canvas_object_added", object: obj, fromUser: true });
    } else if (msg.type === "canvas_object_modify") {
      // User modified object
      const idx = canvasState.objects.findIndex(o => o.id === msg.object.id);
      if (idx >= 0) {
        canvasState.objects[idx] = { ...canvasState.objects[idx], ...msg.object };
        broadcast({ type: "canvas_object_modified", object: canvasState.objects[idx], fromUser: true });
      }
    } else if (msg.type === "canvas_object_delete") {
      // User deleted object
      canvasState.objects = canvasState.objects.filter(o => o.id !== msg.id);
      broadcast({ type: "canvas_object_deleted", id: msg.id, fromUser: true });
    } else if (msg.type === "canvas_sync") {
      // User sends full canvas state
      canvasState.objects = msg.objects || [];
    }
  });

  // Serve static viewer files
  const viewerPath = join(__dirname, "../../viewer/dist");
  app.use(express.static(viewerPath));

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
      timestamp: new Date().toISOString(),
    });
  });

  // ============ END HTTP API ============

  // Fallback: serve inline HTML if viewer not built
  app.get("/", (req, res) => {
    res.send(getInlineViewer());
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
  <title>Live Canvas - Collaborative Brainstorm</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      height: 100vh;
      overflow: hidden;
    }
    .header {
      background: #1e293b;
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 1rem;
      height: 50px;
    }
    .header h1 {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .status {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }
    .status-dot.connected { background: #22c55e; }
    .container {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      height: calc(100vh - 50px);
    }
    .panel {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #334155;
    }
    .panel:last-child { border-right: none; }
    .panel-header {
      background: #334155;
      padding: 0.5rem 1rem;
      font-weight: 500;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .panel-header .hint {
      font-size: 0.7rem;
      color: #94a3b8;
      font-weight: normal;
      text-transform: none;
    }
    .panel-content {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    /* Notes panel - editable */
    #notes-editor {
      width: 100%;
      height: 100%;
      padding: 1rem;
      background: #1e293b;
      color: #e2e8f0;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.6;
      resize: none;
    }
    #notes-editor:focus {
      background: #1e3a5f;
    }

    /* Canvas panel */
    #canvas-container {
      background: #1a1a2e;
      width: 100%;
      height: 100%;
    }
    #whiteboard {
      width: 100%;
      height: 100%;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }
    .toolbar button {
      padding: 0.4rem 0.8rem;
      background: #334155;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .toolbar button:hover { background: #475569; }
    .toolbar button.active { background: #3b82f6; border-color: #60a5fa; }
    .toolbar .separator {
      width: 1px;
      background: #475569;
      margin: 0 0.5rem;
    }
    .color-btn {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      border-radius: 50% !important;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Live Canvas</h1>
    <span style="color: #64748b">Collaborative Brainstorm</span>
    <div class="status">
      <div class="status-dot" id="status-dot"></div>
      <span id="status-text">Disconnected</span>
    </div>
  </div>

  <div class="container">
    <!-- Left: Editable Notes -->
    <div class="panel">
      <div class="panel-header">
        Notes
        <span class="hint">(editable - changes sync to AI)</span>
      </div>
      <div class="panel-content">
        <textarea id="notes-editor" placeholder="Start typing notes here...&#10;&#10;Both you and the AI can edit this."></textarea>
      </div>
    </div>

    <!-- Right: Whiteboard -->
    <div class="panel">
      <div class="panel-header">
        Whiteboard
        <span class="hint">(draw, drag, edit - AI can also draw here)</span>
      </div>
      <div class="toolbar">
        <button id="tool-select" class="active" title="Select & Move">↖ Select</button>
        <button id="tool-rect" title="Rectangle">▢ Rect</button>
        <button id="tool-circle" title="Circle">○ Circle</button>
        <button id="tool-text" title="Text">T Text</button>
        <button id="tool-line" title="Line">╱ Line</button>
        <button id="tool-draw" title="Freehand">✎ Draw</button>
        <div class="separator"></div>
        <button class="color-btn" style="background:#3b82f6" data-color="#3b82f6"></button>
        <button class="color-btn" style="background:#22c55e" data-color="#22c55e"></button>
        <button class="color-btn" style="background:#f59e0b" data-color="#f59e0b"></button>
        <button class="color-btn" style="background:#ef4444" data-color="#ef4444"></button>
        <button class="color-btn" style="background:#e2e8f0" data-color="#e2e8f0"></button>
        <div class="separator"></div>
        <button id="tool-delete" title="Delete Selected">🗑 Delete</button>
        <button id="tool-clear" title="Clear All">Clear</button>
      </div>
      <div class="panel-content" id="canvas-container">
        <canvas id="whiteboard"></canvas>
      </div>
    </div>
  </div>

  <script>
    // ============ STATE ============
    let ws = null;
    let canvas = null;
    let currentTool = 'select';
    let currentColor = '#3b82f6';
    let isDrawing = false;
    let ignoreNextChange = false;

    // ============ WEBSOCKET ============
    function connect() {
      ws = new WebSocket('ws://' + window.location.host);

      ws.onopen = () => {
        document.getElementById('status-dot').classList.add('connected');
        document.getElementById('status-text').textContent = 'Connected';
      };

      ws.onclose = () => {
        document.getElementById('status-dot').classList.remove('connected');
        document.getElementById('status-text').textContent = 'Disconnected';
        setTimeout(connect, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (e) {
          console.error('Parse error:', e);
        }
      };
    }

    function send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }

    function handleServerMessage(msg) {
      switch (msg.type) {
        case 'notes_sync':
          if (msg.fromAI) {
            document.getElementById('notes-editor').value = msg.content;
          }
          break;

        case 'canvas_object_added':
          if (msg.fromAI) {
            addObjectToCanvas(msg.object);
          }
          break;

        case 'canvas_object_modified':
          if (msg.fromAI) {
            updateObjectOnCanvas(msg.object);
          }
          break;

        case 'canvas_object_deleted':
          if (msg.fromAI) {
            removeObjectFromCanvas(msg.id);
          }
          break;

        case 'canvas_clear':
          if (msg.fromAI) {
            canvas.clear();
            canvas.backgroundColor = '#1a1a2e';
            canvas.renderAll();
          }
          break;
      }
    }

    // ============ CANVAS SYNC ============
    function addObjectToCanvas(obj) {
      let fabricObj = null;
      const baseProps = {
        left: obj.left,
        top: obj.top,
        fill: obj.fill || 'transparent',
        stroke: obj.stroke || '#3b82f6',
        strokeWidth: obj.strokeWidth || 2,
        id: obj.id,
      };

      switch (obj.type) {
        case 'rect':
          fabricObj = new fabric.Rect({
            ...baseProps,
            width: obj.width || 100,
            height: obj.height || 60,
          });
          break;
        case 'circle':
          fabricObj = new fabric.Circle({
            ...baseProps,
            radius: obj.radius || 30,
          });
          break;
        case 'text':
          fabricObj = new fabric.IText(obj.text || 'Text', {
            left: obj.left,
            top: obj.top,
            fill: obj.fill || '#e2e8f0',
            fontSize: obj.fontSize || 16,
            fontFamily: 'sans-serif',
            id: obj.id,
          });
          break;
        case 'line':
          fabricObj = new fabric.Line(obj.points || [0, 0, 100, 100], {
            stroke: obj.stroke || '#3b82f6',
            strokeWidth: obj.strokeWidth || 2,
            id: obj.id,
          });
          break;
        case 'arrow':
          // Simple arrow as line with triangle
          const [x1, y1, x2, y2] = obj.points || [0, 0, 100, 100];
          fabricObj = new fabric.Line([x1, y1, x2, y2], {
            stroke: obj.stroke || '#3b82f6',
            strokeWidth: obj.strokeWidth || 2,
            id: obj.id,
          });
          // Add arrowhead
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = 15;
          const triangle = new fabric.Triangle({
            left: x2,
            top: y2,
            width: headLen,
            height: headLen,
            fill: obj.stroke || '#3b82f6',
            angle: (angle * 180 / Math.PI) + 90,
            originX: 'center',
            originY: 'center',
            id: obj.id + '-head',
          });
          canvas.add(fabricObj, triangle);
          canvas.renderAll();
          return;
        case 'path':
          fabricObj = new fabric.Path(obj.path, {
            stroke: obj.stroke || '#3b82f6',
            strokeWidth: obj.strokeWidth || 2,
            fill: 'transparent',
            id: obj.id,
          });
          break;
      }

      if (fabricObj) {
        canvas.add(fabricObj);
        canvas.renderAll();
      }
    }

    function updateObjectOnCanvas(obj) {
      const fabricObj = canvas.getObjects().find(o => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set(obj);
        canvas.renderAll();
      }
    }

    function removeObjectFromCanvas(id) {
      const objs = canvas.getObjects().filter(o => o.id === id || o.id === id + '-head');
      objs.forEach(o => canvas.remove(o));
      canvas.renderAll();
    }

    // ============ USER ACTIONS ============
    function sendObjectToServer(fabricObj, action = 'add') {
      const obj = {
        id: fabricObj.id,
        type: fabricObj.type === 'i-text' ? 'text' : fabricObj.type,
        left: fabricObj.left,
        top: fabricObj.top,
        width: fabricObj.width,
        height: fabricObj.height,
        radius: fabricObj.radius,
        text: fabricObj.text,
        fill: fabricObj.fill,
        stroke: fabricObj.stroke,
        strokeWidth: fabricObj.strokeWidth,
        fontSize: fabricObj.fontSize,
      };

      if (action === 'add') {
        send({ type: 'canvas_object_add', object: obj });
      } else if (action === 'modify') {
        send({ type: 'canvas_object_modify', object: obj });
      }
    }

    // ============ TOOLBAR ============
    function setTool(tool) {
      currentTool = tool;
      document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
      document.getElementById('tool-' + tool)?.classList.add('active');

      canvas.isDrawingMode = (tool === 'draw');
      canvas.selection = (tool === 'select');

      if (tool === 'draw') {
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = 2;
      }
    }

    function setColor(color) {
      currentColor = color;
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = color;
      }
    }

    // ============ INIT ============
    function initCanvas() {
      const container = document.getElementById('canvas-container');
      const rect = container.getBoundingClientRect();

      canvas = new fabric.Canvas('whiteboard', {
        width: rect.width,
        height: rect.height - 40, // toolbar height
        backgroundColor: '#1a1a2e',
        selection: true,
      });

      // Object created (by user)
      canvas.on('object:added', (e) => {
        if (e.target && !e.target.id) {
          e.target.id = 'user-' + Date.now();
          sendObjectToServer(e.target, 'add');
        }
      });

      // Object modified (by user)
      canvas.on('object:modified', (e) => {
        if (e.target && e.target.id) {
          sendObjectToServer(e.target, 'modify');
        }
      });

      // Mouse events for drawing shapes
      let startX, startY, tempObj;

      canvas.on('mouse:down', (e) => {
        if (currentTool === 'select' || currentTool === 'draw') return;

        const pointer = canvas.getPointer(e.e);
        startX = pointer.x;
        startY = pointer.y;
        isDrawing = true;

        if (currentTool === 'rect') {
          tempObj = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: currentColor,
            strokeWidth: 2,
          });
        } else if (currentTool === 'circle') {
          tempObj = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: 'transparent',
            stroke: currentColor,
            strokeWidth: 2,
          });
        } else if (currentTool === 'line') {
          tempObj = new fabric.Line([startX, startY, startX, startY], {
            stroke: currentColor,
            strokeWidth: 2,
          });
        } else if (currentTool === 'text') {
          tempObj = new fabric.IText('Text', {
            left: startX,
            top: startY,
            fill: currentColor,
            fontSize: 18,
            fontFamily: 'sans-serif',
          });
          tempObj.id = 'user-' + Date.now();
          canvas.add(tempObj);
          canvas.setActiveObject(tempObj);
          tempObj.enterEditing();
          sendObjectToServer(tempObj, 'add');
          tempObj = null;
          isDrawing = false;
          setTool('select');
          return;
        }

        if (tempObj) {
          canvas.add(tempObj);
        }
      });

      canvas.on('mouse:move', (e) => {
        if (!isDrawing || !tempObj) return;

        const pointer = canvas.getPointer(e.e);

        if (currentTool === 'rect') {
          const w = pointer.x - startX;
          const h = pointer.y - startY;
          tempObj.set({
            width: Math.abs(w),
            height: Math.abs(h),
            left: w < 0 ? pointer.x : startX,
            top: h < 0 ? pointer.y : startY,
          });
        } else if (currentTool === 'circle') {
          const r = Math.sqrt(Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2));
          tempObj.set({ radius: r });
        } else if (currentTool === 'line') {
          tempObj.set({ x2: pointer.x, y2: pointer.y });
        }

        canvas.renderAll();
      });

      canvas.on('mouse:up', () => {
        if (isDrawing && tempObj) {
          tempObj.id = 'user-' + Date.now();
          tempObj.setCoords();
          sendObjectToServer(tempObj, 'add');
        }
        isDrawing = false;
        tempObj = null;
      });

      // Freehand drawing done
      canvas.on('path:created', (e) => {
        e.path.id = 'user-' + Date.now();
        send({
          type: 'canvas_object_add',
          object: {
            id: e.path.id,
            type: 'path',
            path: e.path.path.map(p => p.join(' ')).join(' '),
            stroke: e.path.stroke,
            strokeWidth: e.path.strokeWidth,
            left: e.path.left,
            top: e.path.top,
          }
        });
      });

      // Resize canvas on window resize
      window.addEventListener('resize', () => {
        const rect = container.getBoundingClientRect();
        canvas.setDimensions({ width: rect.width, height: rect.height - 40 });
      });
    }

    function initToolbar() {
      document.getElementById('tool-select').onclick = () => setTool('select');
      document.getElementById('tool-rect').onclick = () => setTool('rect');
      document.getElementById('tool-circle').onclick = () => setTool('circle');
      document.getElementById('tool-text').onclick = () => setTool('text');
      document.getElementById('tool-line').onclick = () => setTool('line');
      document.getElementById('tool-draw').onclick = () => setTool('draw');

      document.querySelectorAll('.color-btn').forEach(btn => {
        btn.onclick = () => setColor(btn.dataset.color);
      });

      document.getElementById('tool-delete').onclick = () => {
        const active = canvas.getActiveObjects();
        active.forEach(obj => {
          send({ type: 'canvas_object_delete', id: obj.id });
          canvas.remove(obj);
        });
        canvas.discardActiveObject();
        canvas.renderAll();
      };

      document.getElementById('tool-clear').onclick = () => {
        if (confirm('Clear the entire whiteboard?')) {
          canvas.clear();
          canvas.backgroundColor = '#1a1a2e';
          canvas.renderAll();
          send({ type: 'canvas_sync', objects: [] });
        }
      };
    }

    function initNotes() {
      const editor = document.getElementById('notes-editor');
      let debounceTimer;

      editor.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          send({ type: 'notes_edit', content: editor.value });
        }, 300);
      });
    }

    // ============ START ============
    document.addEventListener('DOMContentLoaded', () => {
      connect();
      initCanvas();
      initToolbar();
      initNotes();
    });
  </script>
</body>
</html>`;
}
