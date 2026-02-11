import { useState, useCallback } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Zap, ArrowRight, AlertTriangle } from 'lucide-react'

const METRIC_TOOLTIPS: Record<string, string> = {
  'stat-total-steps': 'Number of discrete time steps the simulation ran before completing or reaching max iterations.',
  'stat-components-affected': 'How many unique components had at least one parameter value changed during the simulation.',
  'stat-events-generated': 'Total count of all events (forced + cascade) triggered across all time steps.',
}

export function SimulationResults() {
  const result = useSimulationStore((s) => s.result)
  const error = useSimulationStore((s) => s.error)
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null)
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  const handleComponentClick = useCallback((componentId: string) => {
    setSelectedDetail((prev) => (prev === componentId ? null : componentId))
    document.dispatchEvent(
      new CustomEvent('tutorial-action', { detail: { actionType: 'results-panel-click' } })
    )
  }, [])

  const handleBottleneckClick = useCallback((componentId: string) => {
    setSelectedDetail((prev) => (prev === componentId ? null : componentId))
    document.dispatchEvent(
      new CustomEvent('tutorial-action', { detail: { actionType: 'bottleneck-click' } })
    )
  }, [])

  const handleMetricHover = useCallback((testId: string) => {
    setHoveredMetric(testId)
    document.dispatchEvent(
      new CustomEvent('tutorial-action', { detail: { actionType: 'metrics-hover' } })
    )
  }, [])

  if (error && !result) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-[var(--color-accent-red)]" data-testid="sim-results-error">{error}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Fix the issue and run again.</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--color-text-muted)]" data-testid="sim-results-empty">
          Configure and run a simulation to see results
        </p>
      </div>
    )
  }

  const allEvents = result.timesteps.flatMap((ts) => ts.events)
  const activeTimesteps = result.timesteps.filter((ts) => ts.events.length > 0)

  // Compute affected components with event counts
  const componentEventCounts = new Map<string, { name: string; count: number }>()
  for (const event of allEvents) {
    const id = event.targetId
    const existing = componentEventCounts.get(id)
    if (existing) {
      existing.count++
    } else {
      componentEventCounts.set(id, { name: event.componentName, count: 1 })
    }
    // Also count as source for forced events
    if (event.type === 'forced' && event.sourceId === event.targetId) continue
    if (event.sourceId !== event.targetId) {
      const srcExisting = componentEventCounts.get(event.sourceId)
      if (!srcExisting) {
        // Find source component name from any event
        const srcEvent = allEvents.find((e) => e.sourceId === event.sourceId || e.targetId === event.sourceId)
        const srcName = srcEvent
          ? (srcEvent.targetId === event.sourceId ? srcEvent.componentName : event.sourceId)
          : event.sourceId
        componentEventCounts.set(event.sourceId, { name: srcName, count: 0 })
      }
    }
  }

  // Compute bottleneck — components ranked by cascade events triggered (as source)
  const cascadeEvents = allEvents.filter((e) => e.type === 'cascade')
  const cascadeSourceCounts = new Map<string, { name: string; count: number }>()
  for (const event of cascadeEvents) {
    const existing = cascadeSourceCounts.get(event.sourceId)
    if (existing) {
      existing.count++
    } else {
      // Find source name
      const srcEvent = allEvents.find((e) => e.targetId === event.sourceId)
      const name = srcEvent?.componentName ?? event.sourceId
      cascadeSourceCounts.set(event.sourceId, { name, count: 1 })
    }
  }
  const bottlenecks = Array.from(cascadeSourceCounts.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)

  // Get events for a specific component (for detail view)
  const getComponentEvents = (componentId: string) =>
    allEvents.filter((e) => e.targetId === componentId || e.sourceId === componentId)

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Summary metrics — wrapped for tutorial spotlight */}
      <div data-testid="simulation-metrics" className="mb-6">
        <div className="grid grid-cols-3 gap-4" data-testid="sim-results-summary">
          <StatCard
            label="Total Steps"
            value={result.totalSteps}
            testId="stat-total-steps"
            tooltip={METRIC_TOOLTIPS['stat-total-steps']}
            isHovered={hoveredMetric === 'stat-total-steps'}
            onHover={handleMetricHover}
            onLeave={() => setHoveredMetric(null)}
          />
          <StatCard
            label="Components Affected"
            value={result.componentsAffected}
            testId="stat-components-affected"
            tooltip={METRIC_TOOLTIPS['stat-components-affected']}
            isHovered={hoveredMetric === 'stat-components-affected'}
            onHover={handleMetricHover}
            onLeave={() => setHoveredMetric(null)}
          />
          <StatCard
            label="Events Generated"
            value={allEvents.length}
            testId="stat-events-generated"
            tooltip={METRIC_TOOLTIPS['stat-events-generated']}
            isHovered={hoveredMetric === 'stat-events-generated'}
            onHover={handleMetricHover}
            onLeave={() => setHoveredMetric(null)}
          />
        </div>
      </div>

      {/* Affected Components */}
      {componentEventCounts.size > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Components</h3>
          <div className="space-y-1 mb-6" data-testid="results-component-list">
            {Array.from(componentEventCounts.entries()).map(([id, data]) => (
              <div key={id}>
                <button
                  data-testid="results-component-entry"
                  onClick={() => handleComponentClick(id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-left cursor-pointer"
                >
                  {selectedDetail === id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="text-xs text-[var(--color-text)] font-medium">{data.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                    {data.count} event{data.count !== 1 ? 's' : ''}
                  </span>
                </button>
                {selectedDetail === id && (
                  <div data-testid="results-component-detail" className="ml-4 mt-1 mb-2 border-l-2 border-[var(--color-primary)]/30 pl-3">
                    {getComponentEvents(id).map((event, i) => (
                      <div key={i} className="text-[10px] py-0.5 flex items-center gap-1">
                        <span className="font-mono text-[var(--color-primary)]">t={event.time}</span>
                        <span className={event.type === 'forced' ? 'text-[var(--color-accent-orange)]' : 'text-[var(--color-text-muted)]'}>
                          [{event.type}]
                        </span>
                        <span className="text-[var(--color-text)]">.{event.parameterName}</span>
                        <span className="text-[var(--color-text-muted)]">{event.oldValue} → {event.newValue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottleneck Analysis */}
      {bottlenecks.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-[var(--color-accent-orange)]" />
            Bottleneck Analysis
          </h3>
          <div data-testid="bottleneck-section" className="space-y-1 mb-6">
            {bottlenecks.map((b, i) => (
              <button
                key={b.id}
                data-testid="bottleneck-entry"
                onClick={() => handleBottleneckClick(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-left cursor-pointer"
              >
                <span className={cn(
                  'text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  i === 0 ? 'bg-[var(--color-accent-orange)]/20 text-[var(--color-accent-orange)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                )}>
                  {i + 1}
                </span>
                <span className="text-xs text-[var(--color-text)] font-medium">{b.name}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                  {b.count} cascade{b.count !== 1 ? 's' : ''} triggered
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Timeline */}
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Timeline</h3>

      {activeTimesteps.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]" data-testid="sim-no-events">
            No events occurred during the simulation.
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="sim-timeline">
          {activeTimesteps.map((ts) => (
            <TimestepRow key={ts.time} time={ts.time} events={ts.events} />
          ))}
        </div>
      )}

      {/* Final state */}
      {Object.keys(result.finalState).length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 mt-6">Final State</h3>
          <div
            className="border border-[var(--color-border)] rounded-lg overflow-hidden"
            data-testid="sim-final-state"
          >
            <div className="grid grid-cols-[1fr_1fr_100px] gap-2 px-3 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
              <span>Component</span>
              <span>Parameter</span>
              <span>Value</span>
            </div>
            {Object.entries(result.finalState).map(([_compId, params]) => {
              const compEvent = result.timesteps
                .flatMap((ts) => ts.events)
                .find((e) => e.targetId === _compId || e.sourceId === _compId)
              const compName = compEvent?.componentName ?? _compId

              return Object.entries(params).map(([_paramId, value]) => {
                const paramEvent = result.timesteps
                  .flatMap((ts) => ts.events)
                  .find(
                    (e) =>
                      (e.targetId === _compId || e.sourceId === _compId) &&
                      e.parameterId === _paramId
                  )
                const paramName = paramEvent?.parameterName ?? _paramId
                const firstTs = result.timesteps[0]
                const initialValue = firstTs?.snapshot[_compId]?.[_paramId]
                const changed = initialValue !== undefined && initialValue !== value

                return (
                  <div
                    key={`${_compId}-${_paramId}`}
                    className="grid grid-cols-[1fr_1fr_100px] gap-2 px-3 py-2 border-b border-[var(--color-border)] last:border-b-0 items-center text-xs"
                  >
                    <span className="text-[var(--color-text)]">{compName}</span>
                    <span className="text-[var(--color-text-muted)]">{paramName}</span>
                    <span
                      className={cn(
                        'font-mono',
                        changed
                          ? 'text-[var(--color-accent-orange)] font-semibold'
                          : 'text-[var(--color-text)]'
                      )}
                    >
                      {value}
                    </span>
                  </div>
                )
              })
            })}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  testId,
  tooltip,
  isHovered,
  onHover,
  onLeave,
}: {
  label: string
  value: number
  testId?: string
  tooltip?: string
  isHovered?: boolean
  onHover?: (testId: string) => void
  onLeave?: () => void
}) {
  return (
    <div
      className="px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] relative"
      data-testid={testId}
      onMouseEnter={() => testId && onHover?.(testId)}
      onMouseOver={() => testId && onHover?.(testId)}
      onMouseLeave={() => onLeave?.()}
    >
      <div className="text-2xl font-bold text-[var(--color-text)]">{value}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      {isHovered && tooltip && (
        <div
          data-testid="metric-tooltip"
          className="absolute left-0 right-0 top-full mt-1 z-20 px-3 py-2 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] shadow-lg text-[10px] text-[var(--color-text-muted)] leading-relaxed"
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}

function TimestepRow({
  time,
  events,
}: {
  time: number
  events: Array<{
    type: 'forced' | 'cascade'
    componentName: string
    parameterName: string
    oldValue: number
    newValue: number
  }>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors text-left cursor-pointer"
        data-testid={`timestep-${time}`}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs font-mono text-[var(--color-primary)]">t={time}</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-1 ml-auto">
          {events.some((e) => e.type === 'forced') && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-orange)]/20 text-[var(--color-accent-orange)]">
              forced
            </span>
          )}
          {events.some((e) => e.type === 'cascade') && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
              cascade
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)]">
          {events.map((event, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-[var(--color-border)] last:border-b-0"
            >
              {event.type === 'forced' ? (
                <Zap size={12} className="text-[var(--color-accent-orange)] flex-shrink-0" />
              ) : (
                <ArrowRight size={12} className="text-[var(--color-primary)] flex-shrink-0" />
              )}
              <span className="text-[var(--color-text)]">{event.componentName}</span>
              <span className="text-[var(--color-text-muted)]">.{event.parameterName}</span>
              <span className="font-mono text-[var(--color-text-muted)]">{event.oldValue}</span>
              <ArrowRight size={10} className="text-[var(--color-text-muted)] flex-shrink-0" />
              <span className="font-mono text-[var(--color-accent-green)] font-semibold">
                {event.newValue}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
