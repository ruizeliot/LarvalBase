import { Link } from 'react-router-dom'
import type { Pipeline, PipelinePhase } from '../types'

interface PipelineGraphProps {
  pipeline: Pipeline
  selectedPhase?: string
  onPhaseClick?: (phase: string) => void
  inlineSelection?: boolean // If true, clicking selects phase inline; if false, navigates
}

const PHASES = ['0a', '0b', '1', '2', '3']

function PhaseNode({
  phase,
  pipelinePhase,
  pipelineId,
  isActive,
  isSelected,
  onClick,
  inlineSelection,
}: {
  phase: string
  pipelinePhase?: PipelinePhase
  pipelineId: string
  isActive: boolean
  isSelected: boolean
  onClick?: () => void
  inlineSelection?: boolean
}) {
  const status = pipelinePhase?.status || 'pending'

  const statusStyles: Record<string, string> = {
    pending: 'bg-gray-700 border-gray-600',
    'in-progress': 'bg-blue-900 border-blue-500 animate-pulse',
    complete: 'bg-green-900 border-green-500',
    failed: 'bg-red-900 border-red-500',
  }

  const classNames = `
    flex flex-col items-center justify-center
    w-24 h-24 rounded-lg border-2
    ${statusStyles[status]}
    ${isActive ? 'active ring-2 ring-yellow-400' : ''}
    ${isSelected ? 'ring-2 ring-blue-400' : ''}
    hover:opacity-80 transition-opacity cursor-pointer
  `

  // If inline selection mode, use button; otherwise use Link
  if (inlineSelection && onClick) {
    return (
      <button
        onClick={onClick}
        className={classNames}
        data-testid={`phase-${phase}`}
      >
        <span className="text-lg font-bold">{phase}</span>
        <span className="text-xs text-gray-400 mt-1 capitalize">{status}</span>
        {pipelinePhase?.workerName && (
          <span className="text-xs text-gray-500 mt-1 truncate max-w-full px-2">
            {pipelinePhase.workerName}
          </span>
        )}
      </button>
    )
  }

  return (
    <Link
      to={`/pipeline/${pipelineId}/phase/${phase}`}
      className={classNames}
      data-testid={`phase-${phase}`}
    >
      <span className="text-lg font-bold">{phase}</span>
      <span className="text-xs text-gray-400 mt-1 capitalize">{status}</span>
      {pipelinePhase?.workerName && (
        <span className="text-xs text-gray-500 mt-1 truncate max-w-full px-2">
          {pipelinePhase.workerName}
        </span>
      )}
    </Link>
  )
}

export default function PipelineGraph({
  pipeline,
  selectedPhase,
  onPhaseClick,
  inlineSelection = false,
}: PipelineGraphProps) {
  return (
    <div
      className="flex items-center justify-center space-x-4 py-8"
      data-testid="phase-diagram"
    >
      {PHASES.map((phase, index) => (
        <div key={phase} className="flex items-center">
          <PhaseNode
            phase={phase}
            pipelinePhase={pipeline.phases.find((p) => p.name === phase)}
            pipelineId={pipeline.id}
            isActive={pipeline.currentPhase === phase}
            isSelected={selectedPhase === phase}
            onClick={() => onPhaseClick?.(phase)}
            inlineSelection={inlineSelection}
          />
          {index < PHASES.length - 1 && (
            <div className="w-8 h-0.5 bg-gray-600 mx-2" />
          )}
        </div>
      ))}
    </div>
  )
}
