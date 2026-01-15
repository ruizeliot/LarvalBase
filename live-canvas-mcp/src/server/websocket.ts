import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();
let messageHandler: ((msg: any) => void) | null = null;

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
