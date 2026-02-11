import { useState, useEffect } from 'react'
import { useTutorialStore } from '@/store/tutorialStore'
import { useCollaborationStore } from '@/store/collaborationStore'
import { TUTORIAL_PROGRESS_KEY, OLD_TUTORIAL_KEY } from './tutorialConfig'

interface WelcomeOverlayProps {
  onStartTutorial?: () => void
}

export function WelcomeOverlay({ onStartTutorial }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(false)
  const markWelcomeSeen = useTutorialStore((s) => s.markWelcomeSeen)
  const migrateFromV2 = useTutorialStore((s) => s.migrateFromV2)
  const startPhase = useTutorialStore((s) => s.startPhase)
  const pendingRoomId = useCollaborationStore((s) => s.pendingRoomId)

  useEffect(() => {
    // Handle V2 migration first
    const oldKey = localStorage.getItem(OLD_TUTORIAL_KEY)
    if (oldKey) {
      migrateFromV2()
      return // V2 users skip welcome overlay
    }

    // Check if welcome was already seen
    const progressRaw = localStorage.getItem(TUTORIAL_PROGRESS_KEY)
    if (progressRaw) {
      try {
        const progress = JSON.parse(progressRaw)
        if (progress.welcomeSeen) return
      } catch {
        // Continue to show welcome
      }
    }

    // If user is joining a room via ?room= URL, skip the welcome overlay
    const params = new URLSearchParams(window.location.search)
    if (params.get('room')) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [migrateFromV2])

  // Hide if a room join is pending
  if (!visible || pendingRoomId) return null

  function handleSkip() {
    markWelcomeSeen()
    setVisible(false)
  }

  function handleStart() {
    markWelcomeSeen()
    setVisible(false)
    if (onStartTutorial) {
      onStartTutorial()
    } else {
      // Open tutorial menu with Phase 1 highlighted
      document.dispatchEvent(
        new CustomEvent('open-tutorial-menu', { detail: { highlightPhase: 1 } })
      )
    }
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
