import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import type { ChainStageStatus } from '@/engine/chainStageEvaluator'
import type { PlaybackState } from '@/store/simulationStore'

interface CausalEdgeData {
  chainId?: string
  compact?: boolean
  chainStage?: ChainStageStatus
  playbackState?: PlaybackState
  isSimulating?: boolean
}

export function CausalEdge({ sourceX, sourceY, targetX, targetY, label, data, ...props }: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX, sourceY, targetX, targetY,
  })

  const edgeData = data as CausalEdgeData | undefined
  const chainStage = edgeData?.chainStage
  const playbackState = edgeData?.playbackState
  const isSimulating = edgeData?.isSimulating ?? false
  const showPulse = isSimulating && chainStage && chainStage !== 'none'

  // Compute pulse position at midpoint of edge
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  const isPaused = playbackState === 'paused'

  return (
    <>
      <BaseEdge
        path={edgePath}
        {...props}
        style={{
          stroke: showPulse ? 'var(--color-accent-green)' : 'var(--color-primary)',
          strokeWidth: showPulse ? 3 : 2,
        }}
        markerEnd="url(#causal-arrow)"
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          className="fill-[var(--color-text-muted)]"
          fontSize={10}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {String(label)}
        </text>
      )}
      {/* Animated pulse diamond */}
      {showPulse && (
        <g
          data-testid="chain-pulse"
          className="chain-pulse"
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          <rect
            x={midX - 6}
            y={midY - 6}
            width={12}
            height={12}
            fill="var(--color-accent-green)"
            stroke="white"
            strokeWidth={1}
            transform={`rotate(45 ${midX} ${midY})`}
            style={{ filter: 'drop-shadow(0 0 4px var(--color-accent-green))' }}
          />
        </g>
      )}
      <defs>
        <marker
          id="causal-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--color-primary)" />
        </marker>
      </defs>
    </>
  )
}
