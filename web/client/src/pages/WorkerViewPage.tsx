import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { signalPhase, killWorker } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import Terminal from '../components/Terminal'

// Use the same base URL as the app (handles /pipeline-gui-test/ prefix)
const basePath = import.meta.env.BASE_URL || '/'
const API_BASE = `${basePath}api`.replace(/\/+/g, '/')

export default function WorkerViewPage() {
  const { id, phase } = useParams<{ id: string; phase: string }>()
  const [error, setError] = useState('')
  const [showKillConfirm, setShowKillConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const token = useAuthStore((state) => state.token)

  const workerId = `worker-${phase}` // Placeholder - would come from API

  const handleSignal = async () => {
    if (!id || !phase) return

    try {
      await signalPhase(id, phase)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to signal phase')
    }
  }

  const handleKillWorker = async () => {
    try {
      await killWorker(workerId)
      setShowKillConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kill worker')
    }
  }

  const handleCopyOutput = async () => {
    try {
      // Placeholder - would get actual terminal content
      await navigator.clipboard.writeText('Terminal output would be here')
      // Show success toast
    } catch {
      setError('Failed to copy output')
    }
  }

  const handleSend = async () => {
    if (!message.trim()) return

    try {
      const response = await fetch(`${API_BASE}/workers/${workerId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ message: message.trim() }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to send message')
      }

      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Phase {phase}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyOutput}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            data-testid="copy-output"
          >
            Copy Output
          </button>
          <button
            onClick={handleSignal}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded"
            data-testid="signal-complete"
          >
            Signal Complete
          </button>
          <button
            onClick={() => setShowKillConfirm(true)}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
            data-testid="kill-worker"
          >
            Kill Worker
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 text-red-300 p-3 rounded mb-4" data-testid="error">
          {error}
        </div>
      )}

      {/* Terminal */}
      <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
        <Terminal
          targetId={workerId}
          targetType="worker"
          className="h-96"
        />
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Send message to worker..."
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded"
          data-testid="worker-input"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          data-testid="worker-send"
        >
          Send
        </button>
      </div>

      {/* Kill Confirmation Modal */}
      {showKillConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Kill Worker?</h2>
            <p className="text-gray-400 mb-6">
              This will terminate the worker process. Any in-progress work will be
              lost.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKillConfirm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                data-testid="cancel-kill"
              >
                Cancel
              </button>
              <button
                onClick={handleKillWorker}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                data-testid="confirm-kill"
              >
                Kill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
