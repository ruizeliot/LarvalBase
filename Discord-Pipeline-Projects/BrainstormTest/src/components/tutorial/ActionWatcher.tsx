import { useEffect, useRef } from 'react'
import { useTutorialStore } from '@/store/tutorialStore'
import { useModelStore } from '@/store/modelStore'
import { useScenarioStore } from '@/store/scenarioStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUiStore } from '@/store/uiStore'
import { wasLastModelChangeRemote } from '@/lib/collaboration'
import { getPhase } from './tutorialConfig'

/**
 * Watches for user actions during the tutorial and marks steps as complete.
 * Uses the actionType field from tutorialConfig to determine what to watch.
 */
export function ActionWatcher() {
  const tourActive = useTutorialStore((s) => s.tourActive)
  const activePhase = useTutorialStore((s) => s.activePhase)
  const currentStep = useTutorialStore((s) => s.currentStep)
  const completeAction = useTutorialStore((s) => s.completeAction)
  const completedActions = useTutorialStore((s) => s.completedActions)

  const prevComponentCount = useRef(0)
  const prevComponentNames = useRef<Record<string, string>>({})
  const prevParamCounts = useRef<Record<string, number>>({})
  const prevRunning = useRef(false)
  const prevChainBuilderOpen = useRef(false)
  const prevScenarioCount = useRef(0)
  const prevChainCount = useRef(0)
  const prevForcedEventCount = useRef(0)

  const components = useModelStore((s) => s.components)
  const chains = useModelStore((s) => s.chains)
  const scenarios = useScenarioStore((s) => s.scenarios)
  const running = useSimulationStore((s) => s.running)
  const chainBuilderOpen = useUiStore((s) => s.chainBuilderOpen)

  // Get current step's actionType
  function getCurrentActionType(): string | undefined {
    if (!activePhase) return undefined
    const phaseConfig = getPhase(activePhase)
    if (!phaseConfig) return undefined
    return phaseConfig.steps[currentStep]?.actionType
  }

  // Phase 1 Step 0: drag-component — component count increases
  // Phase 2 Step 0: branching-chain — new chain from existing source
  useEffect(() => {
    if (!tourActive) return
    if (wasLastModelChangeRemote()) {
      prevComponentCount.current = Object.keys(components).length
      return
    }

    const actionType = getCurrentActionType()
    const componentCount = Object.keys(components).length

    if (actionType === 'drag-component' && componentCount > prevComponentCount.current && !completedActions.has(currentStep)) {
      completeAction(currentStep)
    }

    prevComponentCount.current = componentCount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, components, currentStep, activePhase])

  // Phase 1 Step 1: configure-component — rename or add parameter
  // Phase 2 Step 1: edit-params — add/edit parameters
  useEffect(() => {
    if (!tourActive) return

    const currentNames: Record<string, string> = {}
    const currentParamCounts: Record<string, number> = {}
    for (const [id, comp] of Object.entries(components)) {
      currentNames[id] = comp.name
      currentParamCounts[id] = comp.parameters.length
    }

    if (wasLastModelChangeRemote()) {
      prevComponentNames.current = currentNames
      prevParamCounts.current = currentParamCounts
      return
    }

    const actionType = getCurrentActionType()

    if ((actionType === 'configure-component' || actionType === 'edit-params') && !completedActions.has(currentStep)) {
      // Detect name change
      let detected = false
      for (const [id, name] of Object.entries(currentNames)) {
        if (prevComponentNames.current[id] && prevComponentNames.current[id] !== name) {
          detected = true
          break
        }
      }
      // Detect parameter added/changed
      if (!detected) {
        for (const [id, count] of Object.entries(currentParamCounts)) {
          if (prevParamCounts.current[id] !== undefined && count > prevParamCounts.current[id]) {
            detected = true
            break
          }
        }
      }
      if (detected) {
        completeAction(currentStep)
      }
    }

    prevComponentNames.current = currentNames
    prevParamCounts.current = currentParamCounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, components, currentStep, activePhase])

  // Phase 1 Step 2: create-chain — chain builder opens
  useEffect(() => {
    if (!tourActive) return

    const actionType = getCurrentActionType()

    if (actionType === 'create-chain' && chainBuilderOpen && !prevChainBuilderOpen.current && !completedActions.has(currentStep)) {
      completeAction(currentStep)
    }
    prevChainBuilderOpen.current = chainBuilderOpen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, chainBuilderOpen, currentStep, activePhase])

  // Phase 1 Step 3: build-scenario — scenario/forced event added
  useEffect(() => {
    if (!tourActive) return
    if (wasLastModelChangeRemote()) {
      prevScenarioCount.current = Object.keys(scenarios).length
      // Count all forced events
      let totalEvents = 0
      for (const s of Object.values(scenarios)) {
        totalEvents += s.forcedEvents.length
      }
      prevForcedEventCount.current = totalEvents
      return
    }

    const actionType = getCurrentActionType()
    const scenarioCount = Object.keys(scenarios).length
    let totalEvents = 0
    for (const s of Object.values(scenarios)) {
      totalEvents += s.forcedEvents.length
    }

    if (actionType === 'build-scenario' && !completedActions.has(currentStep)) {
      // Detect new scenario or new forced event
      if (scenarioCount > prevScenarioCount.current || totalEvents > prevForcedEventCount.current) {
        completeAction(currentStep)
      }
    }

    prevScenarioCount.current = scenarioCount
    prevForcedEventCount.current = totalEvents
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, scenarios, currentStep, activePhase])

  // Phase 1 Step 4: run-simulation — simulation starts running
  useEffect(() => {
    if (!tourActive) return

    const actionType = getCurrentActionType()

    if (actionType === 'run-simulation' && running && !prevRunning.current && !completedActions.has(currentStep)) {
      completeAction(currentStep)
    }
    prevRunning.current = running
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, running, currentStep, activePhase])

  // Phase 2 Step 0: branching-chain — new chain added from same source
  useEffect(() => {
    if (!tourActive) return
    if (wasLastModelChangeRemote()) {
      prevChainCount.current = Object.keys(chains).length
      return
    }

    const actionType = getCurrentActionType()
    const chainCount = Object.keys(chains).length

    if (actionType === 'branching-chain' && chainCount > prevChainCount.current && !completedActions.has(currentStep)) {
      completeAction(currentStep)
    }

    prevChainCount.current = chainCount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, chains, currentStep, activePhase])

  // Phase 2 Step 2: auto-layout and Step 3: relayout-direction
  // These are detected via custom events dispatched by the layout buttons
  useEffect(() => {
    if (!tourActive) return

    function handleLayoutComplete(e: Event) {
      const detail = (e as CustomEvent).detail
      const actionType = getCurrentActionType()

      if (detail?.type === 'auto-layout' && actionType === 'auto-layout' && !completedActions.has(currentStep)) {
        completeAction(currentStep)
      }
      if (detail?.type === 'relayout-direction' && actionType === 'relayout-direction' && !completedActions.has(currentStep)) {
        completeAction(currentStep)
      }
    }

    document.addEventListener('tutorial-layout-action', handleLayoutComplete)
    return () => document.removeEventListener('tutorial-layout-action', handleLayoutComplete)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, currentStep, activePhase, completedActions])

  // Phase 3 & 4: Custom events from UI interactions
  useEffect(() => {
    if (!tourActive) return

    function handleTutorialAction(e: Event) {
      const detail = (e as CustomEvent).detail
      const actionType = getCurrentActionType()

      if (detail?.actionType === actionType && !completedActions.has(currentStep)) {
        completeAction(currentStep)
      }
    }

    document.addEventListener('tutorial-action', handleTutorialAction)
    return () => document.removeEventListener('tutorial-action', handleTutorialAction)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, currentStep, activePhase, completedActions])

  return null
}
