import { useEffect, useRef, useCallback } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useTutorialStore } from '@/store/tutorialStore'
import { getPhase } from './tutorialConfig'

export function GuidedTour() {
  const tourActive = useTutorialStore((s) => s.tourActive)
  const activePhase = useTutorialStore((s) => s.activePhase)
  const endTour = useTutorialStore((s) => s.endTour)
  const setStep = useTutorialStore((s) => s.setStep)
  const currentStep = useTutorialStore((s) => s.currentStep)
  const completedActions = useTutorialStore((s) => s.completedActions)
  const completeAction = useTutorialStore((s) => s.completeAction)
  const completeCurrentPhase = useTutorialStore((s) => s.completeCurrentPhase)
  const driverRef = useRef<Driver | null>(null)

  const completedActionsRef = useRef(completedActions)
  completedActionsRef.current = completedActions

  const activePhaseRef = useRef(activePhase)
  activePhaseRef.current = activePhase

  const handleDestroy = useCallback(() => {
    endTour()
  }, [endTour])

  // Handle skip-action custom events from the popover HTML
  useEffect(() => {
    function handleSkipAction(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.step === 'number') {
        completeAction(detail.step)
        if (driverRef.current && driverRef.current.isActive()) {
          driverRef.current.moveNext()
        }
      }
    }
    document.addEventListener('tutorial-skip-action', handleSkipAction)
    return () => document.removeEventListener('tutorial-skip-action', handleSkipAction)
  }, [completeAction])

  useEffect(() => {
    if (!tourActive || !activePhase) {
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
      return
    }

    const phaseConfig = getPhase(activePhase)
    if (!phaseConfig) return

    const steps = phaseConfig.steps
    const totalSteps = steps.length

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
        const isAction = steps[stepIndex]?.actionRequired
        if (isAction) {
          document.body.classList.add('tutorial-action-active')
        } else {
          document.body.classList.remove('tutorial-action-active')
        }
      },
      onDestroyStarted: () => {
        document.body.classList.remove('tutorial-action-active')
        if (driverRef.current) {
          driverRef.current.destroy()
          driverRef.current = null
        }
        handleDestroy()
      },
      onDestroyed: () => {
        handleDestroy()
      },
      steps: steps.map((step, index) => {
        const isActionStep = step.actionRequired
        return {
          element: step.element,
          popover: {
            title: step.title,
            description: buildDescription(
              step.description,
              step.actionPrompt,
              isActionStep,
              index,
              totalSteps,
              completedActionsRef.current,
              activePhase
            ),
            onNextClick: () => {
              if (isActionStep && !completedActionsRef.current.has(index)) {
                return
              }
              if (driverRef.current) {
                const currentIdx = driverRef.current.getActiveIndex() ?? 0
                if (currentIdx >= totalSteps - 1) {
                  // Last step completed — finish phase
                  driverRef.current.destroy()
                  driverRef.current = null
                  completeCurrentPhase()
                  // Dispatch completion event for CompletionOverlay
                  document.dispatchEvent(
                    new CustomEvent('tutorial-phase-complete', {
                      detail: { phase: activePhaseRef.current },
                    })
                  )
                } else {
                  driverRef.current.moveNext()
                }
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

    // Start from the requested step (for resume)
    if (currentStep > 0 && currentStep < totalSteps) {
      driverInstance.drive(currentStep)
    } else {
      driverInstance.drive()
    }

    // Arrow key navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!driverRef.current || !driverRef.current.isActive()) return
      if (e.key === 'ArrowRight') {
        const currentIdx = driverRef.current.getActiveIndex() ?? 0
        const currentTutStep = steps[currentIdx]
        if (currentTutStep?.actionRequired && !completedActionsRef.current.has(currentIdx)) return
        if (currentIdx >= totalSteps - 1) {
          driverRef.current.destroy()
          driverRef.current = null
          completeCurrentPhase()
          document.dispatchEvent(
            new CustomEvent('tutorial-phase-complete', {
              detail: { phase: activePhaseRef.current },
            })
          )
        } else {
          driverRef.current.moveNext()
        }
      } else if (e.key === 'ArrowLeft') {
        const currentIdx = driverRef.current.getActiveIndex() ?? 0
        if (currentIdx > 0) {
          driverRef.current.movePrevious()
        }
      } else if (e.key === 'Escape') {
        driverRef.current.destroy()
        driverRef.current = null
        handleDestroy()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('tutorial-action-active')
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, activePhase])

  // Update popover DOM when actions complete
  useEffect(() => {
    if (!tourActive || !driverRef.current || !driverRef.current.isActive()) return

    const phaseConfig = activePhase ? getPhase(activePhase) : null
    const steps = phaseConfig?.steps ?? []
    const currentTutStep = steps[currentStep]

    if (currentTutStep?.actionRequired && completedActions.has(currentStep)) {
      const promptEl = document.querySelector('[data-testid="tutorial-action-prompt"]')
      const skipEl = promptEl?.parentElement?.querySelector('[data-testid="tutorial-skip-action"]')?.parentElement
      if (promptEl) {
        promptEl.outerHTML = `<div data-testid="tutorial-action-complete" style="margin-top: 8px; padding: 6px 10px; background: rgba(34,197,94,0.15); border-radius: 6px; color: #22c55e; font-size: 12px;">&#10003; Action completed!</div>`
      }
      if (skipEl) {
        skipEl.remove()
      }
      if (!promptEl) {
        const descEl = document.querySelector('.driver-popover-description')
        if (descEl && !descEl.querySelector('[data-testid="tutorial-action-complete"]')) {
          const completionDiv = document.createElement('div')
          completionDiv.setAttribute('data-testid', 'tutorial-action-complete')
          completionDiv.style.cssText = 'margin-top: 8px; padding: 6px 10px; background: rgba(34,197,94,0.15); border-radius: 6px; color: #22c55e; font-size: 12px;'
          completionDiv.innerHTML = '&#10003; Action completed!'
          descEl.appendChild(completionDiv)
        }
      }
    }
  }, [tourActive, completedActions, currentStep, activePhase])

  return null
}

function buildDescription(
  baseDesc: string,
  actionPrompt: string | undefined,
  isActionStep: boolean | undefined,
  index: number,
  totalSteps: number,
  completedActions: Set<number>,
  _phaseId: number
): string {
  let desc = ''

  // Step counter
  desc += `<div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">`
  desc += `<span data-testid="step-counter" style="font-size: 11px; color: #94a3b8;">Step ${index + 1} of ${totalSteps}</span>`
  // Progress dots
  desc += `<span data-testid="progress-dots" style="display: flex; gap: 3px;">`
  for (let i = 0; i < totalSteps; i++) {
    const filled = i < index || completedActions.has(i)
    const active = i === index
    desc += `<span style="width: 6px; height: 6px; border-radius: 50%; background: ${
      filled ? '#3b82f6' : active ? '#60a5fa' : '#2a2a3a'
    };"></span>`
  }
  desc += `</span></div>`

  desc += baseDesc

  if (isActionStep && actionPrompt) {
    if (completedActions.has(index)) {
      desc += `<div data-testid="tutorial-action-complete" style="margin-top: 8px; padding: 6px 10px; background: rgba(34,197,94,0.15); border-radius: 6px; color: #22c55e; font-size: 12px;">&#10003; Action completed!</div>`
    } else {
      desc += `<div data-testid="tutorial-action-prompt" style="margin-top: 8px; padding: 6px 10px; background: rgba(59,130,246,0.15); border-radius: 6px; color: #93c5fd; font-size: 12px;">${actionPrompt}</div>`
      desc += `<div style="margin-top: 4px; text-align: right;"><a data-testid="tutorial-skip-action" href="#" onclick="document.dispatchEvent(new CustomEvent('tutorial-skip-action', {detail:{step:${index}}})); return false;" style="font-size: 11px; color: #94a3b8; text-decoration: underline;">Skip Step</a></div>`
    }
  }

  return desc
}
