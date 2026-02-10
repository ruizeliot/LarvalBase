import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { X, Lightbulb } from 'lucide-react'

interface InfoCardNodeData {
  text: string
  infoCardId: string
  onDismiss: (id: string) => void
}

export const InfoCardNode = memo(function InfoCardNode({ data }: NodeProps) {
  const { text, infoCardId, onDismiss } = data as unknown as InfoCardNodeData

  return (
    <div
      data-testid={`info-card-${infoCardId}`}
      className="info-card-node"
    >
      <div className="info-card-content rounded-lg border-2 border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 p-3 min-w-[200px] max-w-[260px] shadow-lg">
        <div className="flex items-start gap-2">
          <Lightbulb size={14} className="text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
          <p data-testid="info-text" className="text-xs text-[var(--color-text)] leading-relaxed flex-1">
            {text}
          </p>
          <button
            data-testid="info-dismiss"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss(infoCardId)
            }}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
})
