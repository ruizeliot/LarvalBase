import { useEffect, useRef } from 'react'
import { useTutorialStore } from '@/store/tutorialStore'
import { useModelStore } from '@/store/modelStore'
import { useScenarioStore } from '@/store/scenarioStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUiStore } from '@/store/uiStore'

/**
 * Watches for user actions during the tutorial and marks steps as complete.
 * Step indices match tutorialConfig.ts:
 *   1 = Drag first component onto canvas
 *   2 = Rename component or add parameter
 *   3 = Drag second component onto canvas
 *   4 = Open causal chain builder (right-click → New Causal Chain)
 *   5 = Open Scenario Library and load a pre-built scenario
 *   6 = Click Run Simulation
 */
export function ActionWatcher() {
  const tourActive = useTutorialStore((s) => s.tourActive)
  const currentStep = useTutorialStore((s) => s.currentStep)
  const completeAction = useTutorialStore((s) => s.completeAction)
  const completedActions = useTutorialStore((s) => s.completedActions)

  const prevComponentCount = useRef(0)
  const prevComponentNames = useRef<Record<string, string>>({})
  const prevParamCounts = useRef<Record<string, number>>({})
  const prevRunning = useRef(false)
  const prevChainBuilderOpen = useRef(false)
  const prevScenarioCount = useRef(0)

  const components = useModelStore((s) => s.components)
  const scenarios = useScenarioStore((s) => s.scenarios)
  const running = useSimulationStore((s) => s.running)
  const chainBuilderOpen = useUiStore((s) => s.chainBuilderOpen)

  // Step 1: Drag first component onto canvas
  useEffect(() => {
    if (!tourActive) return

    const componentCount = Object.keys(components).length
    if (componentCount > prevComponentCount.current && currentStep === 1 && !completedActions.has(1)) {
      completeAction(1)
    }
    // Step 3: Drag second component (count goes from 1 to 2+)
    if (componentCount > prevComponentCount.current && componentCount >= 2 && currentStep === 3 && !completedActions.has(3)) {
      completeAction(3)
    }
    prevComponentCount.current = componentCount
  }, [tourActive, components, currentStep, completeAction, completedActions])

  // Step 2: Rename component or add parameter
  useEffect(() => {
    if (!tourActive) return

    const currentNames: Record<string, string> = {}
    const currentParamCounts: Record<string, number> = {}
    for (const [id, comp] of Object.entries(components)) {
      currentNames[id] = comp.name
      currentParamCounts[id] = comp.parameters.length
    }

    if (currentStep === 2 && !completedActions.has(2)) {
      // Detect name change
      for (const [id, name] of Object.entries(currentNames)) {
        if (prevComponentNames.current[id] && prevComponentNames.current[id] !== name) {
          completeAction(2)
          break
        }
      }
      // Detect parameter added
      if (!completedActions.has(2)) {
        for (const [id, count] of Object.entries(currentParamCounts)) {
          if (prevParamCounts.current[id] !== undefined && count > prevParamCounts.current[id]) {
            completeAction(2)
            break
          }
        }
      }
    }

    prevComponentNames.current = currentNames
    prevParamCounts.current = currentParamCounts
  }, [tourActive, components, currentStep, completeAction, completedActions])

  // Step 4: Open chain builder via right-click context menu
  useEffect(() => {
    if (!tourActive) return

    if (chainBuilderOpen && !prevChainBuilderOpen.current && currentStep === 4 && !completedActions.has(4)) {
      completeAction(4)
    }
    prevChainBuilderOpen.current = chainBuilderOpen
  }, [tourActive, chainBuilderOpen, currentStep, completeAction, completedActions])

  // Step 5: Load a scenario from the Library (scenario count increases)
  useEffect(() => {
    if (!tourActive) return

    const scenarioCount = Object.keys(scenarios).length
    if (scenarioCount > prevScenarioCount.current && currentStep === 5 && !completedActions.has(5)) {
      completeAction(5)
    }
    prevScenarioCount.current = scenarioCount
  }, [tourActive, scenarios, currentStep, completeAction, completedActions])

  // Step 6: Click Run Simulation
  useEffect(() => {
    if (!tourActive) return

    if (running && !prevRunning.current && currentStep === 6 && !completedActions.has(6)) {
      completeAction(6)
    }
    prevRunning.current = running
  }, [tourActive, running, currentStep, completeAction, completedActions])

  return null
}
