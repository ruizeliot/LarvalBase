import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'

export function CausalEdge({ sourceX, sourceY, targetX, targetY, label, ...props }: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX, sourceY, targetX, targetY,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        {...props}
        style={{ stroke: 'var(--color-primary)', strokeWidth: 2 }}
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
