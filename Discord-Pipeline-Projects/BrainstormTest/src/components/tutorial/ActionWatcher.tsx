import { useEffect, useRef } from 'react'
import { useTutorialStore } from '@/store/tutorialStore'
import { useModelStore } from '@/store/modelStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUiStore } from '@/store/uiStore'

/**
 * Watches for user actions during the tutorial and marks steps as complete.
 * Step indices match tutorialConfig.ts:
 *   1 = Component palette (drag component onto canvas)
 *   2 = Property editor (rename component)
 *   3 = Causal chain builder (open chain builder via right-click context menu)
 *   6 = Simulate tab (click Run button)
 */
export function ActionWatcher() {
  const tourActive = useTutorialStore((s) => s.tourActive)
  const currentStep = useTutorialStore((s) => s.currentStep)
  const completeAction = useTutorialStore((s) => s.completeAction)
  const completedActions = useTutorialStore((s) => s.completedActions)

  const prevComponentCount = useRef(0)
  const prevComponentNames = useRef<Record<string, string>>({})
  const prevRunning = useRef(false)
  const prevChainBuilderOpen = useRef(false)

  const components = useModelStore((s) => s.components)
  const running = useSimulationStore((s) => s.running)
  const chainBuilderOpen = useUiStore((s) => s.chainBuilderOpen)

  // Track component count for step 1 (drag component)
  useEffect(() => {
    if (!tourActive) return

    const componentCount = Object.keys(components).length
    if (componentCount > prevComponentCount.current && currentStep === 1 && !completedActions.has(1)) {
      completeAction(1)
    }
    prevComponentCount.current = componentCount
  }, [tourActive, components, currentStep, completeAction, completedActions])

  // Track component name changes for step 2 (rename)
  useEffect(() => {
    if (!tourActive) return

    const currentNames: Record<string, string> = {}
    for (const [id, comp] of Object.entries(components)) {
      currentNames[id] = comp.name
    }

    if (currentStep === 2 && !completedActions.has(2)) {
      for (const [id, name] of Object.entries(currentNames)) {
        if (prevComponentNames.current[id] && prevComponentNames.current[id] !== name) {
          completeAction(2)
          break
        }
      }
    }

    prevComponentNames.current = currentNames
  }, [tourActive, components, currentStep, completeAction, completedActions])

  // Track chain builder opening for step 3 (right-click → New Causal Chain)
  useEffect(() => {
    if (!tourActive) return

    if (chainBuilderOpen && !prevChainBuilderOpen.current && currentStep === 3 && !completedActions.has(3)) {
      completeAction(3)
    }
    prevChainBuilderOpen.current = chainBuilderOpen
  }, [tourActive, chainBuilderOpen, currentStep, completeAction, completedActions])

  // Track simulation Run click for step 6
  useEffect(() => {
    if (!tourActive) return

    if (running && !prevRunning.current && currentStep === 6 && !completedActions.has(6)) {
      completeAction(6)
    }
    prevRunning.current = running
  }, [tourActive, running, currentStep, completeAction, completedActions])

  return null
}
