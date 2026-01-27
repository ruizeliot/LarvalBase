import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import path from "path";
import { watchNotesFile, registerAiElements, addPendingEdit, getPendingEdits } from "../session/edits.js";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();
let messageHandler: ((msg: any) => void) | null = null;

// Store diagrams for initial load
export interface StoredDiagram {
  id: string;
  diagramType: 'ascii' | 'mermaid' | 'plantuml';
  code: string;
  title?: string;
  theme?: string;
}
const diagrams = new Map<string, StoredDiagram>();

export function getDiagrams(): StoredDiagram[] {
  return Array.from(diagrams.values());
}

export function setMessageHandler(handler: (msg: any) => void): void {
  messageHandler = handler;
}

export function initWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.error(`[WebSocket] Client connected. Total: ${clients.size}`);

    // Send current state on connect
    ws.send(
      JSON.stringify({
        type: "session_info",
        message: "Connected to Live Canvas",
        timestamp: new Date().toISOString(),
      })
    );

    // Handle incoming messages from viewer (user edits)
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.error(`[WebSocket] Received: ${msg.type}`);

        // Handle user canvas edits
        if (msg.type === 'user_canvas_edit') {
          addPendingEdit({
            timestamp: Date.now(),
            source: 'canvas',
            description: msg.description || 'User edited canvas'
          });

          // Register AI elements if provided
          if (msg.aiElementIds && Array.isArray(msg.aiElementIds)) {
            registerAiElements(msg.aiElementIds);
          }
        }

        if (messageHandler) {
          messageHandler(msg);
        }
      } catch (e) {
        console.error(`[WebSocket] Failed to parse message:`, e);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.error(`[WebSocket] Client disconnected. Total: ${clients.size}`);
    });

    ws.on("error", (error) => {
      console.error(`[WebSocket] Error:`, error.message);
      clients.delete(ws);
    });
  });
}

export function broadcast(message: object): void {
  const payload = JSON.stringify(message);

  // Store diagram updates for initial load
  const msg = message as Record<string, unknown>;
  if (msg.type === 'diagram_update') {
    const diagram: StoredDiagram = {
      id: msg.id as string,
      diagramType: msg.diagramType as StoredDiagram['diagramType'],
      code: msg.code as string,
      title: msg.title as string | undefined,
      theme: msg.theme as string | undefined,
    };
    diagrams.set(diagram.id, diagram);
    console.error(`[WebSocket] Stored diagram: ${diagram.id}`);
  }

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function getConnectedClients(): number {
  return clients.size;
}

export function closeAllConnections(): void {
  clients.forEach((client) => {
    client.close();
  });
  clients.clear();
}

// Export getPendingEdits for tools to read
export { getPendingEdits };

// Start watching notes file for external edits
export function initNotesWatcher(projectDir: string): () => void {
  const notesPath = path.join(projectDir, 'docs', 'brainstorm-notes.md');

  return watchNotesFile(notesPath, (newContent, addedLines) => {
    console.error('[WS] External notes edit detected');

    // Store for AI to read
    addPendingEdit({
      timestamp: Date.now(),
      source: 'notes',
      description: addedLines.length > 0
        ? `User added: ${addedLines.slice(0, 3).join(', ')}${addedLines.length > 3 ? '...' : ''}`
        : 'User edited notes',
      content: newContent
    });

    // Broadcast to all clients
    broadcast({
      type: 'notes_external_edit',
      content: newContent,
      addedLines
    });
  });
}
