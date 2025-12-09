import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePipelineStore } from '../stores/pipelineStore'
import { getPipeline, stopPipeline, restartFromPhase } from '../services/api'
import PipelineGraph from '../components/PipelineGraph'
import Terminal from '../components/Terminal'

export default function PipelineGraphPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentPipeline, setCurrentPipeline } = usePipelineStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restartPhase, setRestartPhase] = useState('0a')
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [supervisorInput, setSupervisorInput] = useState('')
  const [workerInput, setWorkerInput] = useState('')
  const [_connectionStatus, _setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('connected')

  useEffect(() => {
    if (id) {
      loadPipeline(id)
    }
  }, [id])

  // Set selected phase to current phase when pipeline loads
  useEffect(() => {
    if (currentPipeline && !selectedPhase) {
      setSelectedPhase(currentPipeline.currentPhase)
    }
  }, [currentPipeline, selectedPhase])

  // Get worker name for selected phase
  const getWorkerForPhase = (phase: string | null) => {
    if (!currentPipeline || !phase) return null
    const pipelinePhase = currentPipeline.phases.find((p) => p.name === phase)
    return pipelinePhase?.workerName || null
  }

  const handleSupervisorSend = () => {
    // TODO: Send message via WebSocket when supervisor connection is implemented
    setSupervisorInput('')
  }

  const handleWorkerSend = () => {
    // TODO: Send message via WebSocket when worker connection is implemented
    setWorkerInput('')
  }

  const loadPipeline = async (pipelineId: string) => {
    try {
      const data = await getPipeline(pipelineId)
      setCurrentPipeline(data)
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setError('Pipeline not found')
        setTimeout(() => navigate('/'), 2000)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!id) return

    try {
      await stopPipeline(id)
      await loadPipeline(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop pipeline')
    }
  }

  const handleRestart = async () => {
    if (!id) return

    try {
      await restartFromPhase(id, restartPhase)
      await loadPipeline(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart pipeline')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading pipeline...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400" data-testid="error">
          {error}
        </div>
      </div>
    )
  }

  if (!currentPipeline) {
    return (
      <div className="text-center py-12 text-gray-400">Pipeline not found</div>
    )
  }

  const workerForPhase = getWorkerForPhase(selectedPhase)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 pt-4">
        <div>
          <h1 className="text-2xl font-bold">{currentPipeline.projectName}</h1>
          <p className="text-gray-400">{currentPipeline.projectPath}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/pipeline/${id}/analytics`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            data-testid="analytics-button"
          >
            Analytics
          </button>
          {currentPipeline.status === 'in-progress' && (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              data-testid="stop-button"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Graph (Phase Diagram) */}
      <div className="bg-gray-800 rounded-lg p-4 mx-4 mb-4">
        <PipelineGraph
          pipeline={currentPipeline}
          selectedPhase={selectedPhase || undefined}
          onPhaseClick={(phase) => setSelectedPhase(phase)}
          inlineSelection={true}
        />
      </div>

      {/* Split Terminal View */}
      <div
        className="flex-1 flex gap-4 px-4 pb-4 min-h-0"
        data-testid="split-terminal-container"
      >
        {/* Supervisor Terminal (Left Pane) */}
        <div
          className="flex-1 flex flex-col bg-gray-800 rounded-lg overflow-hidden"
          data-testid="supervisor-pane"
        >
          <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="font-medium">Supervisor Terminal</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                _connectionStatus === 'connected'
                  ? 'bg-green-900 text-green-300'
                  : _connectionStatus === 'reconnecting'
                  ? 'bg-yellow-900 text-yellow-300'
                  : 'bg-red-900 text-red-300'
              }`}
              data-testid="terminal-status"
            >
              {_connectionStatus}
            </span>
          </div>
          <div className="flex-1 overflow-auto" data-testid="supervisor-terminal">
            <Terminal
              targetId={id || ''}
              targetType="supervisor"
              className="h-full"
            />
          </div>
          <div
            className="border-t border-gray-700 p-2 flex gap-2"
            data-testid="supervisor-input-bar"
            style={{ position: 'sticky', bottom: 0 }}
          >
            <input
              type="text"
              value={supervisorInput}
              onChange={(e) => setSupervisorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSupervisorSend()}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Type message..."
              data-testid="supervisor-input"
            />
            <button
              onClick={handleSupervisorSend}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              data-testid="supervisor-send"
            >
              Send
            </button>
            <button
              onClick={() => {
                // TODO: Implement nudge functionality via WebSocket
              }}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
              data-testid="nudge-button"
            >
              Nudge
            </button>
          </div>
        </div>

        {/* Worker Terminal (Right Pane) */}
        <div
          className="flex-1 flex flex-col bg-gray-800 rounded-lg overflow-hidden"
          data-testid="worker-pane"
        >
          <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="font-medium">
              Worker Terminal{' '}
              <span className="text-gray-400" data-testid="worker-pane-phase">
                (Phase: {selectedPhase || 'none'})
              </span>
            </span>
            {workerForPhase ? (
              <span className="text-xs text-gray-400">{workerForPhase}</span>
            ) : (
              <span className="text-xs text-gray-500">No worker</span>
            )}
          </div>
          {workerForPhase ? (
            <>
              <div className="flex-1 overflow-auto" data-testid="worker-terminal">
                <Terminal
                  targetId={workerForPhase}
                  targetType="worker"
                  className="h-full"
                />
              </div>
              <div
                className="border-t border-gray-700 p-2 flex gap-2"
                data-testid="worker-input-bar"
                style={{ position: 'sticky', bottom: 0 }}
              >
                <input
                  type="text"
                  value={workerInput}
                  onChange={(e) => setWorkerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleWorkerSend()}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                  placeholder="Type message..."
                  data-testid="worker-input"
                />
                <button
                  onClick={handleWorkerSend}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  data-testid="worker-send"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div
              className="flex-1 flex items-center justify-center text-gray-500"
              data-testid="worker-no-session"
            >
              No worker for this phase
            </div>
          )}
        </div>
      </div>

      {/* Restart Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mx-4 mb-4 flex items-center gap-4">
        <span className="text-gray-400">Restart from:</span>
        <select
          value={restartPhase}
          onChange={(e) => setRestartPhase(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded"
          data-testid="restart-phase-select"
        >
          <option value="0a">0a</option>
          <option value="0b">0b</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
        <button
          onClick={handleRestart}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          data-testid="restart-button"
        >
          Restart
        </button>
      </div>
    </div>
  )
}
