import { useEffect, useRef, useCallback } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useTutorialStore } from '@/store/tutorialStore'
import { tutorialSteps, TUTORIAL_STORAGE_KEY } from './tutorialConfig'

export function GuidedTour() {
  const tourActive = useTutorialStore((s) => s.tourActive)
  const endTour = useTutorialStore((s) => s.endTour)
  const setStep = useTutorialStore((s) => s.setStep)
  const completedActions = useTutorialStore((s) => s.completedActions)
  const completeAction = useTutorialStore((s) => s.completeAction)
  const driverRef = useRef<Driver | null>(null)

  const completedActionsRef = useRef(completedActions)
  completedActionsRef.current = completedActions

  const handleDestroy = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    endTour()
  }, [endTour])

  // Handle skip-action custom events from the popover HTML
  useEffect(() => {
    function handleSkipAction(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.step === 'number') {
        completeAction(detail.step)
        // Advance to next step
        if (driverRef.current && driverRef.current.isActive()) {
          driverRef.current.moveNext()
        }
      }
    }
    document.addEventListener('tutorial-skip-action', handleSkipAction)
    return () => document.removeEventListener('tutorial-skip-action', handleSkipAction)
  }, [completeAction])

  useEffect(() => {
    if (!tourActive) {
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
      return
    }

    const driverInstance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.7)',
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'cascadesim-tour-popover',
      onHighlightStarted: (_element, _step, opts) => {
        const stepIndex = opts.state.activeIndex ?? 0
        setStep(stepIndex)
      },
      onDestroyStarted: () => {
        if (driverRef.current) {
          driverRef.current.destroy()
          driverRef.current = null
        }
        handleDestroy()
      },
      onDestroyed: () => {
        handleDestroy()
      },
      steps: tutorialSteps.map((step, index) => {
        const isActionStep = step.actionRequired
        return {
          element: step.element,
          popover: {
            title: step.popover?.title ?? '',
            description: buildDescription(step.popover?.description ?? '', step.actionPrompt, isActionStep, index),
            onNextClick: () => {
              if (isActionStep && !completedActionsRef.current.has(index)) {
                return
              }
              if (driverRef.current) {
                driverRef.current.moveNext()
              }
            },
            onPrevClick: () => {
              if (driverRef.current) {
                const currentIdx = driverRef.current.getActiveIndex() ?? 0
                if (currentIdx > 0) {
                  driverRef.current.movePrevious()
                }
              }
            },
          },
        }
      }),
    })

    driverRef.current = driverInstance
    driverInstance.drive()

    // Arrow key navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!driverRef.current || !driverRef.current.isActive()) return
      if (e.key === 'ArrowRight') {
        const currentIdx = driverRef.current.getActiveIndex() ?? 0
        const currentTutStep = tutorialSteps[currentIdx]
        if (currentTutStep?.actionRequired && !completedActionsRef.current.has(currentIdx)) return
        driverRef.current.moveNext()
      } else if (e.key === 'ArrowLeft') {
        const currentIdx = driverRef.current.getActiveIndex() ?? 0
        if (currentIdx > 0) {
          driverRef.current.movePrevious()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [tourActive, handleDestroy, setStep])

  return null
}

function buildDescription(
  baseDesc: string,
  actionPrompt: string | undefined,
  isActionStep: boolean | undefined,
  index: number
): string {
  let desc = baseDesc

  if (isActionStep && actionPrompt) {
    desc += `<div data-testid="tutorial-action-prompt" style="margin-top: 8px; padding: 6px 10px; background: rgba(59,130,246,0.15); border-radius: 6px; color: #93c5fd; font-size: 12px;">${actionPrompt}</div>`
    desc += `<div style="margin-top: 4px; text-align: right;"><a data-testid="tutorial-skip-action" href="#" onclick="document.dispatchEvent(new CustomEvent('tutorial-skip-action', {detail:{step:${index}}})); return false;" style="font-size: 11px; color: #94a3b8; text-decoration: underline;">Skip</a></div>`
  }

  return desc
}
