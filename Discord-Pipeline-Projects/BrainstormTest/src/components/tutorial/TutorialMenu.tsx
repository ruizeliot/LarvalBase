import { Lock, Check, Play, RotateCcw, ChevronRight } from 'lucide-react'
import { useTutorialStore } from '@/store/tutorialStore'
import { TUTORIAL_PHASES, type PhaseStatus } from './tutorialConfig'

interface TutorialMenuProps {
  onClose: () => void
  highlightPhase?: number
}

export function TutorialMenu({ onClose, highlightPhase }: TutorialMenuProps) {
  const progress = useTutorialStore((s) => s.progress)
  const startPhase = useTutorialStore((s) => s.startPhase)
  const resumePhase = useTutorialStore((s) => s.resumePhase)
  const replayPhase = useTutorialStore((s) => s.replayPhase)
  const resetAllProgress = useTutorialStore((s) => s.resetAllProgress)
  const getCompletedPhaseCount = useTutorialStore((s) => s.getCompletedPhaseCount)

  const completedCount = getCompletedPhaseCount()
  const totalPhases = TUTORIAL_PHASES.length
  const progressPercent = (completedCount / totalPhases) * 100

  function getPhaseProgress(phaseId: number) {
    const key = `phase${phaseId}` as keyof typeof progress
    return progress[key] as { status: PhaseStatus; stepsCompleted: number[] }
  }

  function handlePhaseClick(phaseId: number) {
    const phase = getPhaseProgress(phaseId)
    if (phase.status === 'locked') return

    onClose()

    if (phase.status === 'complete') {
      replayPhase(phaseId)
    } else if (phase.status === 'in-progress') {
      resumePhase(phaseId)
    } else {
      startPhase(phaseId)
    }
  }

  function handleReset() {
    if (window.confirm('This will reset all tutorial progress. Continue?')) {
      resetAllProgress()
    }
  }

  return (
    <div
      data-testid="tutorial-menu"
      className="absolute bottom-14 right-0 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden"
    >
      {/* Header with progress bar */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-2">Tutorial</h2>
        <div className="flex items-center gap-2">
          <div
            data-testid="tutorial-progress-bar"
            className="flex-1 h-2 rounded-full bg-[var(--color-border)] overflow-hidden"
          >
            <div
              data-testid="tutorial-progress-fill"
              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span
            data-testid="tutorial-progress-text"
            className="text-xs text-[var(--color-text-muted)] whitespace-nowrap"
          >
            {completedCount} of {totalPhases} phases complete
          </span>
        </div>
      </div>

      {/* Phase cards */}
      <div className="px-2 pb-2 space-y-1">
        {TUTORIAL_PHASES.map((phase) => {
          const phaseProgress = getPhaseProgress(phase.id)
          const isLocked = phaseProgress.status === 'locked'
          const isComplete = phaseProgress.status === 'complete'
          const isInProgress = phaseProgress.status === 'in-progress'
          const isHighlighted = highlightPhase === phase.id
          const stepCount = phase.steps.length

          return (
            <button
              key={phase.id}
              data-testid={`tutorial-phase-${phase.id}`}
              data-phase-status={phaseProgress.status}
              onClick={() => handlePhaseClick(phase.id)}
              disabled={isLocked}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                isLocked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-[var(--color-surface-hover)]'
              } ${isHighlighted ? 'ring-1 ring-[var(--color-primary)] bg-[var(--color-primary)]/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isComplete
                    ? 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]'
                    : isLocked
                      ? 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                      : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                }`}>
                  {isComplete && <Check size={16} data-testid={`phase-${phase.id}-complete-icon`} />}
                  {isLocked && <Lock size={14} data-testid={`phase-${phase.id}-lock-icon`} />}
                  {!isComplete && !isLocked && <span className="text-xs font-bold">{phase.id}</span>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      data-testid={`phase-${phase.id}-title`}
                      className="text-sm font-medium text-[var(--color-text)]"
                    >
                      {phase.title}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      {stepCount} steps
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                    {phase.description}
                  </p>
                  {/* Action indicator */}
                  {isInProgress && (
                    <span
                      data-testid={`phase-${phase.id}-resume-label`}
                      className="text-xs text-[var(--color-primary)] mt-1 inline-flex items-center gap-1"
                    >
                      <Play size={10} /> Resume (Step {(phaseProgress.stepsCompleted.length > 0 ? Math.max(...phaseProgress.stepsCompleted) + 1 : 1)} of {stepCount})
                    </span>
                  )}
                </div>

                {/* Arrow for clickable items */}
                {!isLocked && (
                  <div className="flex-shrink-0 text-[var(--color-text-muted)]">
                    {isComplete ? (
                      <RotateCcw size={14} data-testid={`phase-${phase.id}-replay-icon`} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Reset option */}
      <div className="border-t border-[var(--color-border)] px-3 py-2">
        <button
          data-testid="reset-tutorial"
          onClick={handleReset}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors cursor-pointer"
        >
          Reset Tutorial
        </button>
      </div>
    </div>
  )
}
