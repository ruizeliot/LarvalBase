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

  const handleDestroy = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    endTour()
  }, [endTour])

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
      onHighlightStarted: (_element, step, opts) => {
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
            description: buildDescription(step.popover?.description ?? '', step.actionPrompt, isActionStep, index, completedActions),
            onNextClick: () => {
              if (isActionStep && !completedActions.has(index)) {
                // Don't advance — action not completed
                return
              }
              if (driverRef.current) {
                driverRef.current.moveNext()
              }
            },
            onPrevClick: () => {
              if (driverRef.current) {
                driverRef.current.movePrevious()
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
        if (currentTutStep?.actionRequired && !completedActions.has(currentIdx)) return
        driverRef.current.moveNext()
      } else if (e.key === 'ArrowLeft') {
        driverRef.current.movePrevious()
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
  }, [tourActive, handleDestroy, setStep, completedActions, completeAction])

  // Re-render popover when actions complete to update button states
  useEffect(() => {
    if (!tourActive || !driverRef.current || !driverRef.current.isActive()) return

    const currentIdx = driverRef.current.getActiveIndex() ?? 0
    const currentTutStep = tutorialSteps[currentIdx]

    if (currentTutStep?.actionRequired && completedActions.has(currentIdx)) {
      // Refresh the current step to update the popover
      driverRef.current.refresh()
    }
  }, [tourActive, completedActions])

  return null
}

function buildDescription(
  baseDesc: string,
  actionPrompt: string | undefined,
  isActionStep: boolean | undefined,
  index: number,
  completedActions: Set<number>
): string {
  let desc = baseDesc

  if (isActionStep && actionPrompt) {
    const completed = completedActions.has(index)
    if (completed) {
      desc += `<div data-testid="tutorial-action-complete" style="margin-top: 8px; padding: 6px 10px; background: rgba(34,197,94,0.15); border-radius: 6px; color: #22c55e; font-size: 12px;">&#10003; Action completed!</div>`
    } else {
      desc += `<div data-testid="tutorial-action-prompt" style="margin-top: 8px; padding: 6px 10px; background: rgba(59,130,246,0.15); border-radius: 6px; color: #93c5fd; font-size: 12px;">${actionPrompt}</div>`
      desc += `<div style="margin-top: 4px; text-align: right;"><a data-testid="tutorial-skip-action" href="#" onclick="document.dispatchEvent(new CustomEvent('tutorial-skip-action', {detail:{step:${index}}})); return false;" style="font-size: 11px; color: #94a3b8; text-decoration: underline;">Skip this step</a></div>`
    }
  }

  return desc
}
