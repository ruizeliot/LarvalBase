import { useState, useEffect } from 'react'
import { useWorkerStore } from '../stores/workerStore'
import {
  getWorkers,
  getTokens,
  generateToken,
  revokeToken,
  removeWorker,
  restartCoordinator,
} from '../services/api'
import type { Worker } from '../types'

export default function SettingsPage() {
  const { workers, tokens, setWorkers, setTokens, addToken } = useWorkerStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [workersData, tokensData] = await Promise.all([
        getWorkers(),
        getTokens(),
      ])
      setWorkers(workersData)
      setTokens(tokensData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateToken = async () => {
    try {
      const token = await generateToken()
      addToken(token)
      await navigator.clipboard.writeText(token.token)
      // Show success toast
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token')
    }
  }

  const handleRevokeToken = async (id: string) => {
    try {
      await revokeToken(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token')
    }
  }

  const handleRemoveWorker = async (id: string) => {
    try {
      await removeWorker(id)
      setShowRemoveConfirm(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove worker')
    }
  }

  const handleRestartCoordinator = async () => {
    try {
      await restartCoordinator()
      setShowRestartConfirm(false)
      // Will disconnect - show reconnecting state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart coordinator')
    }
  }

  const getStatusColor = (status: Worker['status']) => {
    switch (status) {
      case 'connected':
      case 'idle':
        return 'bg-green-500'
      case 'busy':
        return 'bg-blue-500'
      case 'disconnected':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {error && (
        <div className="bg-red-900 text-red-300 p-3 rounded" data-testid="error">
          {error}
        </div>
      )}

      {/* Workers Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Workers</h2>
        {workers.length === 0 ? (
          <div className="text-gray-400 py-4" data-testid="no-workers">
            No workers connected
          </div>
        ) : (
          <div className="space-y-2" data-testid="workers-list">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="bg-gray-800 p-4 rounded-lg flex items-center justify-between"
                data-testid={`worker-${worker.id}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      worker.status
                    )}`}
                  />
                  <div>
                    <h3 className="font-medium">{worker.name}</h3>
                    <p className="text-sm text-gray-400">
                      CPU: {worker.cpu ?? 'N/A'}% | RAM: {worker.ram ?? 'N/A'}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRemoveConfirm(worker.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  data-testid={`remove-worker-${worker.id}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tokens Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Connection Tokens</h2>
          <button
            onClick={handleGenerateToken}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            data-testid="generate-token"
          >
            Generate Token
          </button>
        </div>
        {tokens.length === 0 ? (
          <div className="text-gray-400 py-4">No tokens generated</div>
        ) : (
          <div className="space-y-2" data-testid="tokens-list">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="bg-gray-800 p-4 rounded-lg flex items-center justify-between"
              >
                <div>
                  <code className="text-sm bg-gray-700 px-2 py-1 rounded">
                    {token.token.substring(0, 8)}...
                  </code>
                  {token.revoked && (
                    <span className="ml-2 text-red-400 text-sm">Revoked</span>
                  )}
                  {token.usedBy && (
                    <span className="ml-2 text-gray-400 text-sm">
                      Used by: {token.usedBy}
                    </span>
                  )}
                </div>
                {!token.revoked && (
                  <button
                    onClick={() => handleRevokeToken(token.id)}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agent Downloads */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Download Agent</h2>
        <div className="flex gap-4" data-testid="agent-downloads">
          <a
            href="/api/agent/windows"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            data-testid="download-windows"
          >
            Windows
          </a>
          <a
            href="/api/agent/linux"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            data-testid="download-linux"
          >
            Linux
          </a>
          <a
            href="/api/agent/macos"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            data-testid="download-macos"
          >
            macOS
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Run the agent with: <code>./pipeline-agent --token YOUR_TOKEN</code>
        </p>
      </section>

      {/* Coordinator Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Coordinator</h2>
        <button
          onClick={() => setShowRestartConfirm(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          data-testid="restart-coordinator"
        >
          Restart Coordinator
        </button>
      </section>

      {/* Remove Worker Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Remove Worker?</h2>
            <p className="text-gray-400 mb-6">
              This will remove the worker from the registry. If connected, the
              connection will be terminated.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                data-testid="cancel-remove"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveWorker(showRemoveConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                data-testid="confirm-remove"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Coordinator Confirmation Modal */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Restart Coordinator?</h2>
            <p className="text-gray-400 mb-6">
              This will disconnect all sessions and restart the coordinator
              service. The dashboard will reconnect automatically.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartCoordinator}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                data-testid="confirm-restart"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
