import { useState, useEffect } from 'react'
import { TUTORIAL_STORAGE_KEY } from './tutorialConfig'
import { useTutorialStore } from '@/store/tutorialStore'

export function WelcomeOverlay() {
  const [visible, setVisible] = useState(false)
  const startTour = useTutorialStore((s) => s.startTour)

  useEffect(() => {
    const alreadyComplete = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    if (alreadyComplete) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  function handleSkip() {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    setVisible(false)
  }

  function handleStart() {
    setVisible(false)
    startTour()
  }

  return (
    <div
      data-testid="welcome-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 max-w-lg mx-4 text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
          CascadeSim
        </h1>
        <p
          data-testid="welcome-description"
          className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed"
        >
          Model and simulate cascading effects through causal chain networks.
          Define components, build cause-and-effect chains, and run simulations
          to observe how changes propagate through your system.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            data-testid="skip-tutorial-button"
            onClick={handleSkip}
            className="px-4 py-2 rounded-md text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            data-testid="start-tutorial-button"
            onClick={handleStart}
            className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
          >
            Start Tutorial
          </button>
        </div>
      </div>
    </div>
  )
}
