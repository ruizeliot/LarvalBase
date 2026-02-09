import { type EdgeProps, getStraightPath } from '@xyflow/react'

export function ImpactEdge({ sourceX, sourceY, targetX, targetY, id }: EdgeProps) {
  const [, labelX, labelY] = getStraightPath({
    sourceX, sourceY, targetX, targetY,
  })

  // Wavy path
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.max(3, Math.floor(len / 20))
  const nx = -dy / len
  const ny = dx / len
  const amplitude = 5

  let d = `M ${sourceX} ${sourceY}`
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const x = sourceX + dx * t
    const y = sourceY + dy * t
    const offset = Math.sin(t * Math.PI * steps) * amplitude * (i % 2 === 0 ? 1 : -1)
    d += ` L ${x + nx * offset} ${y + ny * offset}`
  }

  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        stroke="var(--color-accent-red)"
        strokeWidth={2}
        strokeDasharray="4 2"
        markerEnd="url(#impact-arrow)"
        data-testid="impact-edge"
      />
      <defs>
        <marker
          id="impact-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--color-accent-red)" />
        </marker>
      </defs>
    </>
  )
}
