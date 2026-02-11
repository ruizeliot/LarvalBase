import { useEffect, useState } from 'react'
import { Check, PartyPopper } from 'lucide-react'
import { useTutorialStore } from '@/store/tutorialStore'
import { TUTORIAL_PHASES, getTotalPhases } from './tutorialConfig'

export function CompletionOverlay() {
  const [visible, setVisible] = useState(false)
  const [completedPhase, setCompletedPhase] = useState<number | null>(null)
  const [isFinalCompletion, setIsFinalCompletion] = useState(false)
  const startPhase = useTutorialStore((s) => s.startPhase)

  // Listen for phase-complete custom events
  useEffect(() => {
    function handlePhaseComplete(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.phase === 'number') {
        const phase = detail.phase
        const total = getTotalPhases()
        setCompletedPhase(phase)
        setIsFinalCompletion(phase >= total)
        setVisible(true)
      }
    }

    document.addEventListener('tutorial-phase-complete', handlePhaseComplete)
    return () => document.removeEventListener('tutorial-phase-complete', handlePhaseComplete)
  }, [])

  if (!visible || completedPhase === null) return null

  const phaseConfig = TUTORIAL_PHASES.find((p) => p.id === completedPhase)
  const nextPhase = completedPhase + 1
  const hasNextPhase = nextPhase <= getTotalPhases()

  function handleContinue() {
    setVisible(false)
    if (hasNextPhase) {
      startPhase(nextPhase)
    }
  }

  function handleDismiss() {
    setVisible(false)
  }

  return (
    <div
      data-testid="completion-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {isFinalCompletion ? (
            <div data-testid="confetti-animation" className="w-16 h-16 rounded-full bg-[var(--color-accent-green)]/15 flex items-center justify-center">
              <PartyPopper size={32} className="text-[var(--color-accent-green)]" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-green)]/15 flex items-center justify-center">
              <Check size={32} className="text-[var(--color-accent-green)]" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          data-testid="completion-title"
          className="text-xl font-bold text-[var(--color-text)] mb-2"
        >
          {isFinalCompletion
            ? "Tutorial Complete!"
            : `Phase ${completedPhase} Complete!`}
        </h2>

        {/* Description */}
        <p
          data-testid="completion-description"
          className="text-sm text-[var(--color-text-muted)] mb-6"
        >
          {isFinalCompletion
            ? "You've mastered CascadeSim. You now know how to build models, run simulations, analyze results, and collaborate in real time."
            : `Great job completing "${phaseConfig?.title}"!`}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            data-testid="completion-dismiss"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-md text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          >
            {isFinalCompletion ? 'Close' : 'Back to App'}
          </button>
          {hasNextPhase && !isFinalCompletion && (
            <button
              data-testid="completion-continue"
              onClick={handleContinue}
              className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
            >
              Continue to Phase {nextPhase}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
