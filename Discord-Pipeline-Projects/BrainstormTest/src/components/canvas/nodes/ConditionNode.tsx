import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface ConditionNodeData {
  label: string
  formula: string
  chainId: string
  stage: string
}

export const ConditionNode = memo(function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as ConditionNodeData
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="px-3 py-1.5 rounded border-2 border-dashed border-[var(--color-text-muted)] bg-[var(--color-surface)] min-w-[100px] text-center"
        data-testid="condition-node"
        data-chain-id={d.chainId}
        data-stage={d.stage}
      >
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{d.label}</span>
      </div>
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded shadow-lg text-xs text-[var(--color-text)] font-mono whitespace-nowrap z-50"
          data-testid="condition-tooltip"
        >
          {d.formula}
        </div>
      )}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--color-text-muted)] !border-[var(--color-border)]" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--color-text-muted)] !border-[var(--color-border)]" />
    </div>
  )
})
