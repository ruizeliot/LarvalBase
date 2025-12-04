import { useAuthStore } from '../stores/authStore'

type MessageHandler = (data: unknown) => void

// Use the same base URL as the app (handles /pipeline-gui-test/ prefix)
const basePath = import.meta.env.BASE_URL || '/'

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect() {
    const token = useAuthStore.getState().token
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPath = `${basePath}ws`.replace(/\/+/g, '/')
    const wsUrl = `${protocol}//${window.location.host}${wsPath}?token=${token}`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, data } = message
        const typeHandlers = this.handlers.get(type)
        if (typeHandlers) {
          typeHandlers.forEach((handler) => handler(data))
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err)
      }
    }

    this.ws.onclose = () => {
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    setTimeout(() => {
      this.connect()
    }, Math.min(delay, 30000))
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  subscribe(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    }
  }

  sendTerminalData(targetId: string, data: string) {
    this.send('terminal_data', { targetId, data })
  }

  attachTerminal(targetId: string, targetType: 'worker' | 'supervisor') {
    this.send('terminal_attach', { targetId, targetType })
  }

  detachTerminal(targetId: string) {
    this.send('terminal_detach', { targetId })
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
