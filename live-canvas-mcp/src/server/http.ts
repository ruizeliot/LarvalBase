import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initWebSocket } from "./websocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function startHttpServer(port: number, autoOpen: boolean): Promise<void> {
  const app = express();
  const server = createServer(app);

  // Initialize WebSocket on same server
  initWebSocket(server);

  // Serve static viewer files
  const viewerPath = join(__dirname, "../../viewer/dist");
  app.use(express.static(viewerPath));

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
  <title>Live Canvas - Brainstorm Viewer</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }
    .header {
      background: #1e293b;
      padding: 1rem 2rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header h1 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .status {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }
    .status-dot.connected {
      background: #22c55e;
    }
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1rem;
      height: calc(100vh - 64px);
    }
    .panel {
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      background: #334155;
      padding: 0.75rem 1rem;
      font-weight: 500;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .panel-content {
      flex: 1;
      overflow: auto;
      padding: 1rem;
    }
    #notes-content {
      line-height: 1.6;
    }
    #notes-content h2 {
      color: #60a5fa;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }
    #notes-content h2:first-child {
      margin-top: 0;
    }
    #notes-content ul, #notes-content ol {
      margin-left: 1.5rem;
    }
    #notes-content li {
      margin-bottom: 0.25rem;
    }
    #notes-content code {
      background: #334155;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .diagram-container {
      margin-bottom: 1rem;
      background: #0f172a;
      border-radius: 6px;
      padding: 1rem;
    }
    .diagram-title {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }
    .mermaid {
      text-align: center;
    }
    .ascii-block {
      font-family: monospace;
      white-space: pre;
      font-size: 0.75rem;
      line-height: 1.2;
      overflow-x: auto;
    }
    #canvas-content {
      position: relative;
      min-height: 400px;
    }
    .shape {
      position: absolute;
      border: 2px solid #60a5fa;
      border-radius: 4px;
      padding: 0.5rem;
      font-size: 0.875rem;
      background: rgba(96, 165, 250, 0.1);
    }
    .shape.ellipse {
      border-radius: 50%;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748b;
      font-style: italic;
    }
    @media (max-width: 768px) {
      .container {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Live Canvas</h1>
    <span style="color: #64748b">Brainstorm Viewer</span>
    <div class="status">
      <div class="status-dot" id="status-dot"></div>
      <span id="status-text">Disconnected</span>
    </div>
  </div>

  <div class="container">
    <div class="panel">
      <div class="panel-header">Notes</div>
      <div class="panel-content" id="notes-content">
        <div class="empty-state">Waiting for brainstorm notes...</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">Diagrams</div>
      <div class="panel-content" id="diagrams-content">
        <div class="empty-state">Waiting for diagrams...</div>
      </div>
    </div>
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        background: '#0f172a',
        primaryColor: '#3b82f6',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#60a5fa',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#334155'
      }
    });

    const notesContent = document.getElementById('notes-content');
    const diagramsContent = document.getElementById('diagrams-content');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    const notes = {};
    const diagrams = {};

    function connect() {
      const ws = new WebSocket('ws://' + window.location.host);

      ws.onopen = () => {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
      };

      ws.onclose = () => {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        setTimeout(connect, 2000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };
    }

    function handleMessage(msg) {
      switch (msg.type) {
        case 'notes_update':
          if (msg.action === 'append') {
            notes[msg.section] = msg.content;
          } else if (msg.action === 'replace') {
            notes[msg.section] = msg.content;
          }
          renderNotes();
          break;

        case 'diagram_update':
          diagrams[msg.id] = {
            type: msg.diagramType,
            code: msg.code,
            title: msg.title,
            theme: msg.theme
          };
          renderDiagrams();
          break;

        case 'canvas_update':
          // Canvas updates would be handled here
          break;

        case 'session_info':
          console.log('Session info:', msg);
          break;
      }
    }

    function renderNotes() {
      if (Object.keys(notes).length === 0) {
        notesContent.innerHTML = '<div class="empty-state">Waiting for brainstorm notes...</div>';
        return;
      }

      let html = '';
      for (const [section, content] of Object.entries(notes)) {
        html += '<h2>' + escapeHtml(section) + '</h2>\\n';
        html += marked.parse(content);
      }
      notesContent.innerHTML = html;
    }

    async function renderDiagrams() {
      if (Object.keys(diagrams).length === 0) {
        diagramsContent.innerHTML = '<div class="empty-state">Waiting for diagrams...</div>';
        return;
      }

      let html = '';
      for (const [id, diagram] of Object.entries(diagrams)) {
        html += '<div class="diagram-container" id="diagram-' + id + '">';
        if (diagram.title) {
          html += '<div class="diagram-title">' + escapeHtml(diagram.title) + '</div>';
        }

        if (diagram.type === 'mermaid') {
          html += '<div class="mermaid">' + escapeHtml(diagram.code) + '</div>';
        } else if (diagram.type === 'ascii') {
          html += '<div class="ascii-block">' + escapeHtml(diagram.code) + '</div>';
        } else if (diagram.type === 'plantuml') {
          html += '<div class="ascii-block">[PlantUML rendering not yet supported]\\n' + escapeHtml(diagram.code) + '</div>';
        }

        html += '</div>';
      }
      diagramsContent.innerHTML = html;

      // Re-render mermaid diagrams
      await mermaid.run();
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    connect();
  </script>
</body>
</html>`;
}
