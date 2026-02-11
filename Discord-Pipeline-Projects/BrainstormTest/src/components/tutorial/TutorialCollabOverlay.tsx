import { useEffect, useRef, useState } from 'react'
import { useTutorialStore } from '@/store/tutorialStore'
import { useModelStore } from '@/store/modelStore'
import { useCollaborationStore } from '@/store/collaborationStore'
import { getPhase } from './tutorialConfig'

/**
 * Renders simulated collaboration elements during Phase 4 tutorial steps 3-5.
 * - Step 3: Ghost cursor on canvas
 * - Step 4: Simulated second avatar in presence bar + auto-complete
 * - Step 5: Simulated edit indicator on a component
 */
export function TutorialCollabOverlay() {
  const tourActive = useTutorialStore((s) => s.tourActive)
  const activePhase = useTutorialStore((s) => s.activePhase)
  const currentStep = useTutorialStore((s) => s.currentStep)
  const completedActions = useTutorialStore((s) => s.completedActions)

  if (!tourActive || activePhase !== 4) return null

  return (
    <>
      {currentStep === 2 && !completedActions.has(2) && <GhostCursor />}
      {currentStep === 3 && !completedActions.has(3) && <SimulatedAvatar />}
      {currentStep === 4 && !completedActions.has(4) && <SimulatedEditIndicator />}
    </>
  )
}

/** Step 3: Animated ghost cursor that moves around the canvas area. */
function GhostCursor() {
  const [position, setPosition] = useState({ x: 300, y: 250 })
  const frameRef = useRef(0)

  useEffect(() => {
    let startTime = Date.now()
    function animate() {
      const elapsed = (Date.now() - startTime) / 1000
      // Gentle circular motion
      setPosition({
        x: 350 + Math.sin(elapsed * 0.8) * 80,
        y: 280 + Math.cos(elapsed * 0.6) * 60,
      })
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div
      data-testid="tutorial-ghost-cursor"
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
        transition: 'left 0.15s linear, top 0.15s linear',
      }}
    >
      <svg width="16" height="20" viewBox="0 0 16 20" fill="#22c55e" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0L16 12L8 12L6 20L0 0Z" />
      </svg>
      <span
        className="ml-3 -mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
        style={{ backgroundColor: '#22c55e', color: '#fff' }}
      >
        Demo User
      </span>
    </div>
  )
}

/** Step 4: Simulated second avatar in the presence bar. Auto-completes after 2s. */
function SimulatedAvatar() {
  const completeAction = useTutorialStore((s) => s.completeAction)

  useEffect(() => {
    // Auto-complete after 2 seconds of observation
    const timer = setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent('tutorial-action', { detail: { actionType: 'presence-bar' } })
      )
    }, 2000)
    return () => clearTimeout(timer)
  }, [completeAction])

  // Render a simulated avatar next to the real presence bar
  return (
    <div
      data-testid="simulated-presence-avatar"
      className="fixed z-50 pointer-events-none"
      style={{
        // Position near the presence bar area (top-right of screen)
        top: 6,
        right: 220,
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse"
        style={{ backgroundColor: '#22c55e' }}
        title="Demo User"
      >
        D
      </div>
    </div>
  )
}

/** Step 5: Simulated edit indicator on the first component. */
function SimulatedEditIndicator() {
  const components = useModelStore((s) => s.components)
  const firstComp = Object.values(components)[0]

  if (!firstComp) return null

  return (
    <div
      data-testid="tutorial-edit-indicator"
      className="fixed pointer-events-none z-40"
      style={{
        // Approximate position near the first component
        left: firstComp.position.x + 50,
        top: firstComp.position.y + 80,
      }}
    >
      <div
        className="px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap animate-pulse"
        style={{
          backgroundColor: '#22c55e',
          color: '#fff',
          boxShadow: '0 0 12px rgba(34, 197, 94, 0.4)',
        }}
      >
        Demo User is editing
      </div>
    </div>
  )
}
