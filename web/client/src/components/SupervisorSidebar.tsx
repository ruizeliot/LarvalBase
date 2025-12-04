import { useState, useEffect, useRef } from 'react'
import { useTerminalStore } from '../stores/terminalStore'
import { useAuthStore } from '../stores/authStore'
import { wsService } from '../services/websocket'

// Use the same base URL as the app (handles /pipeline-gui-test/ prefix)
const basePath = import.meta.env.BASE_URL || '/'
const API_BASE = `${basePath}api`.replace(/\/+/g, '/')

export default function SupervisorSidebar() {
  const [message, setMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const setSupervisorSidebarOpen = useTerminalStore(
    (state) => state.setSupervisorSidebarOpen
  )
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    // Attach to supervisor terminal
    wsService.attachTerminal('supervisor', 'supervisor')
    setIsConnected(true)

    return () => {
      wsService.detachTerminal('supervisor')
    }
  }, [])

  const handleSend = async () => {
    if (!message.trim()) return

    try {
      const response = await fetch(`${API_BASE}/supervisor/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ message: message.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleNudge = async () => {
    try {
      const response = await fetch(`${API_BASE}/supervisor/nudge`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to nudge')
      }
    } catch (err) {
      console.error('Failed to nudge:', err)
    }
  }

  return (
    <div
      className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
      data-testid="supervisor-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="font-semibold text-purple-400">Supervisor</h3>
        <button
          onClick={() => setSupervisorSidebarOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Terminal Area */}
      <div
        ref={terminalRef}
        className="flex-1 bg-black p-2 font-mono text-sm overflow-auto"
        data-testid="supervisor-terminal"
      >
        {!isConnected ? (
          <div className="text-yellow-500">Supervisor not active</div>
        ) : (
          <div className="text-gray-400">Terminal output will appear here...</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-t border-gray-700 flex flex-wrap gap-2">
        <button
          onClick={handleNudge}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
          data-testid="nudge-button"
        >
          Nudge
        </button>
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Send message..."
          className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-500"
          data-testid="supervisor-input"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
          data-testid="supervisor-send"
        >
          Send
        </button>
      </div>
    </div>
  )
}
