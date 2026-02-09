import { memo, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Component } from '@/types/model'
import { useUiStore } from '@/store/uiStore'
import { useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils'

type ComponentNodeData = Component

export const ComponentNode = memo(function ComponentNode({ data, selected }: NodeProps) {
  const comp = data as unknown as ComponentNodeData
  const isInternal = comp.type === 'internal'
  const activeMode = useUiStore((s) => s.activeMode)
  const simResult = useSimulationStore((s) => s.result)
  const currentStep = useSimulationStore((s) => s.currentStep)

  const isSimulating = activeMode === 'simulate' && simResult != null
  const snapshot = isSimulating
    ? simResult.timesteps[currentStep]?.snapshot ?? {}
    : {}

  // Get current snapshot values for this component
  const compSnapshot = snapshot[comp.id] ?? {}

  // Track previous values for highlight
  const prevValuesRef = useRef<Record<string, number>>({})
  const highlightKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isSimulating) {
      prevValuesRef.current = {}
      highlightKeysRef.current = new Set()
      return
    }
    const newHighlights = new Set<string>()
    for (const p of comp.parameters) {
      const currentVal = compSnapshot[p.id] ?? p.value
      const prevVal = prevValuesRef.current[p.id]
      if (prevVal !== undefined && prevVal !== currentVal) {
        newHighlights.add(p.id)
      }
      prevValuesRef.current[p.id] = currentVal
    }
    highlightKeysRef.current = newHighlights
  }, [isSimulating, currentStep, comp.parameters, compSnapshot])

  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[180px] shadow-lg',
        isInternal
          ? 'bg-[var(--color-node-internal)] border-[var(--color-node-internal-border)]'
          : 'bg-[var(--color-node-external)] border-[var(--color-node-external-border)]',
        selected && 'ring-2 ring-white/30'
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white truncate">{comp.name}</span>
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide',
              isInternal
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'bg-[var(--color-accent-orange)]/20 text-[var(--color-accent-orange)]'
            )}
          >
            {comp.type}
          </span>
        </div>
      </div>

      {/* Parameters */}
      {comp.parameters.length > 0 && (
        <div className="px-3 py-1.5">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
            Parameters
          </div>
          {comp.parameters.map((p) => {
            const displayValue = isSimulating ? (compSnapshot[p.id] ?? p.value) : p.value
            const isHighlighted = highlightKeysRef.current.has(p.id)
            return (
              <div key={p.id} className="flex justify-between items-center text-xs py-0.5">
                <span className="text-[var(--color-text-muted)]">{p.name}</span>
                <span
                  data-testid={`node-param-value-${p.name}`}
                  className={cn('text-white font-mono', isHighlighted && 'param-highlight')}
                  key={`${p.name}-${currentStep}`}
                >
                  {displayValue}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Capacities (internal only) */}
      {isInternal && comp.capacities.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/10">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
            Capacities
          </div>
          {comp.capacities.map((c) => (
            <div key={c.id} className="flex justify-between items-center text-xs py-0.5">
              <span className="text-[var(--color-text-muted)]">{c.name}</span>
              <span className="text-white font-mono">
                [{c.min}, {c.max}]
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--color-primary)] !border-[var(--color-border)]" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--color-primary)] !border-[var(--color-border)]" />
      <Handle type="target" position={Position.Left} id="left" className="!w-2 !h-2 !bg-[var(--color-primary)] !border-[var(--color-border)]" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-[var(--color-primary)] !border-[var(--color-border)]" />
    </div>
  )
})
