import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const messageHandlerRef = useRef(options.onMessage);

  // Keep handler ref updated
  messageHandlerRef.current = options.onMessage;

  const connect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[WebSocket] Connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[WebSocket] Disconnected, reconnecting in 2s...');
      reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (messageHandlerRef.current) {
          messageHandlerRef.current(message);
        }
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', e);
      }
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }, []);

  return { isConnected, send };
}
