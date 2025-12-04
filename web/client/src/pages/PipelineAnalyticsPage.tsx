import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPipeline,
  getPipelineAnalytics,
  getPipelineDecisions,
  getPipelineHistory,
  getRunMetrics,
  type PipelineAnalytics,
  type DecisionEntry,
  type HistoryRun,
} from '../services/api'
import type { Pipeline } from '../types'

type TabType = 'metrics' | 'decisions' | 'history'

export default function PipelineAnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('metrics')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Analytics state
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Decisions state
  const [decisions, setDecisions] = useState<DecisionEntry[]>([])
  const [decisionsCount, setDecisionsCount] = useState(0)
  const [decisionsLoading, setDecisionsLoading] = useState(false)
  const [decisionFilter, setDecisionFilter] = useState<string | null>(null)

  // History state
  const [history, setHistory] = useState<HistoryRun[]>([])
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // Load pipeline on mount
  useEffect(() => {
    if (id) {
      loadPipeline(id)
    }
  }, [id])

  // Load tab data when tab changes
  useEffect(() => {
    if (!id) return

    if (activeTab === 'metrics' && !analytics) {
      loadAnalytics(id)
    } else if (activeTab === 'decisions' && decisions.length === 0) {
      loadDecisions(id)
    } else if (activeTab === 'history' && history.length === 0) {
      loadHistory(id)
    }
  }, [activeTab, id])

  const loadPipeline = async (pipelineId: string) => {
    try {
      const data = await getPipeline(pipelineId)
      setPipeline(data)
      // Load analytics by default
      loadAnalytics(pipelineId)
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

  const loadAnalytics = async (pipelineId: string) => {
    setAnalyticsLoading(true)
    try {
      const data = await getPipelineAnalytics(pipelineId)
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const loadDecisions = async (pipelineId: string) => {
    setDecisionsLoading(true)
    try {
      const data = await getPipelineDecisions(pipelineId)
      setDecisions(data.entries)
      setDecisionsCount(data.totalCount)
    } catch (err) {
      console.error('Failed to load decisions:', err)
    } finally {
      setDecisionsLoading(false)
    }
  }

  const loadHistory = async (pipelineId: string) => {
    setHistoryLoading(true)
    try {
      const data = await getPipelineHistory(pipelineId)
      setHistory(data.runs)
      setCurrentRunId(data.currentRunId)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadRunMetrics = async (runId: string) => {
    if (!id) return
    setSelectedRunId(runId)
    setAnalyticsLoading(true)
    try {
      const data = await getRunMetrics(id, runId)
      setAnalytics((prev) => ({
        ...prev!,
        summary: data.summary,
        phases: data.phases,
      }))
      setActiveTab('metrics')
    } catch (err) {
      console.error('Failed to load run metrics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const exportJson = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDuration = (ms: number | null): string => {
    if (ms === null) return '--'
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatCost = (cost: number | null): string => {
    if (cost === null) return '--'
    return `$${cost.toFixed(2)}`
  }

  const filteredDecisions = useMemo(() => {
    if (!decisionFilter) return decisions
    return decisions.filter((d) => d.type === decisionFilter)
  }, [decisions, decisionFilter])

  const decisionTypes = useMemo(() => {
    const types = new Set(decisions.map((d) => d.type))
    return Array.from(types)
  }, [decisions])

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
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

  if (!pipeline) {
    return <div className="text-center py-12 text-gray-400">Pipeline not found</div>
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{pipeline.projectName}</h1>
          <p className="text-gray-400">{pipeline.projectPath}</p>
        </div>
        <button
          onClick={() => navigate(`/pipeline/${id}`)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
        >
          Back to Pipeline
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        <button
          data-testid="analytics-tab-metrics"
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-t ${
            activeTab === 'metrics' ? 'bg-blue-600 active' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Metrics
        </button>
        <button
          data-testid="analytics-tab-decisions"
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 rounded-t ${
            activeTab === 'decisions' ? 'bg-blue-600 active' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Decisions
        </button>
        <button
          data-testid="analytics-tab-history"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-t ${
            activeTab === 'history' ? 'bg-blue-600 active' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="text-center py-8">Loading analytics...</div>
            ) : analytics ? (
              <>
                {/* Summary */}
                <div
                  data-testid="metrics-summary"
                  className="bg-gray-800 rounded-lg p-4 grid grid-cols-4 gap-4"
                >
                  <div>
                    <div className="text-gray-400 text-sm">Total Duration</div>
                    <div data-testid="total-duration" className="text-2xl font-bold">
                      {formatDuration(analytics.summary.totalDuration)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Estimated Cost</div>
                    <div data-testid="estimated-cost" className="text-2xl font-bold">
                      {formatCost(analytics.summary.estimatedCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Test Pass Rate</div>
                    <div data-testid="test-pass-rate" className="text-2xl font-bold">
                      {analytics.summary.testPassRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Phase Count</div>
                    <div data-testid="phase-count" className="text-2xl font-bold">
                      {analytics.summary.phaseCount}
                    </div>
                  </div>
                </div>

                {/* Phase Breakdown Table */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">Phase Breakdown</h3>
                  <table data-testid="phase-breakdown-table" className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="py-2">Phase</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Duration</th>
                        <th className="py-2">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.phases.map((phase) => (
                        <tr
                          key={phase.name}
                          data-testid={`phase-row-${phase.name}`}
                          className="border-b border-gray-700"
                        >
                          <td className="py-2">{phase.name}</td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 rounded text-sm ${
                                phase.status === 'complete'
                                  ? 'bg-green-900 text-green-300'
                                  : phase.status === 'in-progress'
                                  ? 'bg-yellow-900 text-yellow-300'
                                  : phase.status === 'failed'
                                  ? 'bg-red-900 text-red-300'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                            >
                              {phase.status === 'in-progress' ? 'Running' : phase.status}
                            </span>
                          </td>
                          <td className="py-2">{formatDuration(phase.duration)}</td>
                          <td className="py-2">{formatCost(phase.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Test Results */}
                <div data-testid="test-results" className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">Test Results</h3>
                  <div className="space-y-3">
                    {analytics.tests.epics.map((epic, index) => (
                      <div key={epic.name} data-testid={`epic-${index + 1}-progress`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{epic.name}</span>
                          <span>
                            {epic.passed}/{epic.total}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded overflow-hidden">
                          <div
                            className="h-full bg-green-600"
                            style={{ width: `${(epic.passed / epic.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Button */}
                <button
                  data-testid="export-metrics-json"
                  onClick={() => exportJson(analytics, `${pipeline.projectName}-metrics.json`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Export JSON
                </button>
              </>
            ) : (
              <div className="text-gray-400">No analytics available</div>
            )}
          </div>
        )}

        {/* Decisions Tab */}
        {activeTab === 'decisions' && (
          <div className="space-y-4">
            {decisionsLoading ? (
              <div className="text-center py-8">Loading decisions...</div>
            ) : decisions.length === 0 ? (
              <div data-testid="no-decisions-message" className="text-gray-400 text-center py-8">
                No decisions logged
              </div>
            ) : (
              <>
                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDecisionFilter(null)}
                    className={`px-3 py-1 rounded text-sm ${
                      !decisionFilter ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {decisionTypes.map((type) => (
                    <button
                      key={type}
                      data-testid={`filter-${type}`}
                      onClick={() => setDecisionFilter(type)}
                      className={`px-3 py-1 rounded text-sm ${
                        decisionFilter === type ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Count */}
                <div data-testid="decisions-count" className="text-gray-400 text-sm">
                  Showing {filteredDecisions.length} entries
                </div>

                {/* Decisions List */}
                <div
                  data-testid="decisions-list"
                  className="bg-gray-800 rounded-lg overflow-auto"
                  style={{ maxHeight: '60vh', overflowY: 'auto' }}
                >
                  {filteredDecisions.map((entry, index) => (
                    <div
                      key={index}
                      data-testid={`decision-entry-${index}`}
                      className="p-3 border-b border-gray-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          data-testid={`decision-type-${entry.type}`}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            entry.type === 'SPAWN'
                              ? 'bg-green-900 text-green-300'
                              : entry.type === 'KILL'
                              ? 'bg-red-900 text-red-300'
                              : entry.type === 'PHASE_COMPLETE'
                              ? 'bg-blue-900 text-blue-300'
                              : entry.type === 'HEARTBEAT'
                              ? 'bg-gray-700 text-gray-300'
                              : entry.type === 'INTERVENTION'
                              ? 'bg-purple-900 text-purple-300'
                              : entry.type === 'ERROR'
                              ? 'bg-orange-900 text-orange-300'
                              : entry.type === 'CRASH_RECOVERY'
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {entry.type}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1">{entry.description}</div>
                    </div>
                  ))}
                </div>

                {/* Export Button */}
                <button
                  data-testid="export-decisions-json"
                  onClick={() =>
                    exportJson({ entries: decisions, totalCount: decisionsCount }, `${pipeline.projectName}-decisions.json`)
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Export JSON
                </button>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="text-center py-8">Loading history...</div>
            ) : history.length === 0 ? (
              <div data-testid="no-history-message" className="text-gray-400 text-center py-8">
                No previous runs
              </div>
            ) : (
              <>
                {/* Trend Chart Placeholder */}
                <div
                  data-testid="history-trend-chart"
                  className="bg-gray-800 rounded-lg p-4 h-48 flex items-center justify-center"
                >
                  <span className="text-gray-500">Cost/Duration Trend Chart</span>
                </div>

                {/* History List */}
                <div
                  data-testid="history-list"
                  className="bg-gray-800 rounded-lg overflow-auto"
                  style={{ maxHeight: '50vh' }}
                >
                  {history.map((run) => (
                    <div
                      key={run.runId}
                      data-testid={`run-${run.runId}`}
                      data-history-row
                      onClick={() => loadRunMetrics(run.runId)}
                      className={`p-4 border-b border-gray-700 last:border-0 cursor-pointer hover:bg-gray-750 ${
                        run.runId === currentRunId ? 'bg-blue-900/30 current-run' : ''
                      } ${selectedRunId === run.runId ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div data-testid="run-id" className="font-medium">
                            {run.runId}
                          </div>
                          <div data-testid="run-date" className="text-gray-400 text-sm">
                            {new Date(run.date).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-gray-400 text-xs">Duration</div>
                            <div data-testid="run-duration">
                              {run.duration !== null ? formatDuration(run.duration) : 'Data unavailable'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Cost</div>
                            <div data-testid="run-cost">
                              {run.cost !== null ? formatCost(run.cost) : 'Data unavailable'}
                            </div>
                          </div>
                          <div>
                            <span
                              data-testid="run-status"
                              className={`px-2 py-1 rounded text-sm ${
                                run.status === 'complete'
                                  ? 'bg-green-900 text-green-300'
                                  : run.status === 'failed'
                                  ? 'bg-red-900 text-red-300'
                                  : 'bg-yellow-900 text-yellow-300'
                              }`}
                            >
                              {run.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
