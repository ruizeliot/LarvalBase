import { create } from 'zustand'
import type { SimulationState, SimulationResult, SimulationEvent } from '@/types/simulation'
import { runSimulation } from '@/engine/simulator'
import { useModelStore } from './modelStore'
import { useScenarioStore } from './scenarioStore'

export type PlaybackState = 'stopped' | 'playing' | 'paused'

interface SimulationStoreState extends SimulationState {
  playbackState: PlaybackState
  currentStep: number
  speed: number
  _intervalId: ReturnType<typeof setInterval> | null

  setSelectedScenario: (id: string | null) => void
  setTimeStep: (step: number) => void
  setMaxIterations: (max: number) => void
  run: () => void
  reset: () => void

  play: () => void
  pause: () => void
  stop: () => void
  stepForward: () => void
  stepBackward: () => void
  setSpeed: (speed: number) => void
  scrubTo: (step: number) => void
  getCurrentTime: () => number
  getEventsUpToCurrentStep: () => SimulationEvent[]
}

const BASE_INTERVAL_MS = 500

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  running: false,
  config: {
    timeStep: 1,
    maxIterations: 100,
    selectedScenarioId: null,
  },
  result: null,
  error: null,
  playbackState: 'stopped',
  currentStep: 0,
  speed: 1,
  _intervalId: null,

  setSelectedScenario: (id) => {
    set((s) => ({ config: { ...s.config, selectedScenarioId: id } }))
  },

  setTimeStep: (step) => {
    set((s) => ({ config: { ...s.config, timeStep: step } }))
  },

  setMaxIterations: (max) => {
    set((s) => ({ config: { ...s.config, maxIterations: max } }))
  },

  run: () => {
    const { config } = get()
    const { components, chains } = useModelStore.getState()
    const { scenarios } = useScenarioStore.getState()

    const scenarioId = config.selectedScenarioId ?? useScenarioStore.getState().activeScenarioId
    if (!scenarioId) {
      set({ error: 'No scenario selected', result: null })
      return
    }

    const scenario = scenarios[scenarioId]
    if (!scenario) {
      set({ error: 'Selected scenario not found', result: null })
      return
    }

    if (Object.keys(components).length === 0) {
      set({ error: 'No components in model', result: null })
      return
    }

    set({ running: true, error: null })

    try {
      const result: SimulationResult = runSimulation({
        components,
        chains,
        forcedEvents: scenario.forcedEvents,
        timeStep: config.timeStep,
        maxIterations: config.maxIterations,
      })
      set({ result, running: false })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Simulation failed',
        running: false,
        result: null,
      })
    }
  },

  reset: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({ result: null, error: null, running: false, playbackState: 'stopped', currentStep: 0, _intervalId: null })
  },

  play: () => {
    const state = get()

    // If no result yet, compute the simulation first
    if (!state.result) {
      state.run()
      const afterRun = get()
      if (afterRun.error || !afterRun.result) return
    }

    // Clear any existing interval
    if (state._intervalId) clearInterval(state._intervalId)

    const intervalMs = BASE_INTERVAL_MS / get().speed
    const id = setInterval(() => {
      const s = get()
      if (!s.result) return
      const maxStep = s.result.timesteps.length - 1
      if (s.currentStep >= maxStep) {
        // Reached the end — pause
        clearInterval(s._intervalId!)
        set({ playbackState: 'paused', _intervalId: null })
        return
      }
      set({ currentStep: s.currentStep + 1 })
    }, intervalMs)

    set({ playbackState: 'playing', _intervalId: id })
  },

  pause: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({ playbackState: 'paused', _intervalId: null })
  },

  stop: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({ playbackState: 'stopped', currentStep: 0, _intervalId: null })
  },

  stepForward: () => {
    const { result, currentStep } = get()

    // If no result yet, compute the simulation first
    if (!result) {
      get().run()
      const afterRun = get()
      if (afterRun.error || !afterRun.result) return
    }

    const r = get().result
    if (!r) return
    const maxStep = r.timesteps.length - 1
    if (currentStep < maxStep) {
      set({ currentStep: currentStep + 1 })
    }
  },

  stepBackward: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  setSpeed: (speed) => {
    const clamped = Math.max(0.5, Math.min(4, speed))
    const { playbackState, _intervalId } = get()

    set({ speed: clamped })

    // If currently playing, restart interval with new speed
    if (playbackState === 'playing' && _intervalId) {
      clearInterval(_intervalId)
      const intervalMs = BASE_INTERVAL_MS / clamped
      const id = setInterval(() => {
        const s = get()
        if (!s.result) return
        const maxStep = s.result.timesteps.length - 1
        if (s.currentStep >= maxStep) {
          clearInterval(s._intervalId!)
          set({ playbackState: 'paused', _intervalId: null })
          return
        }
        set({ currentStep: s.currentStep + 1 })
      }, intervalMs)
      set({ _intervalId: id })
    }
  },

  scrubTo: (step) => {
    const { result } = get()
    if (!result) return
    const clamped = Math.max(0, Math.min(step, result.timesteps.length - 1))
    set({ currentStep: clamped })
  },

  getCurrentTime: () => {
    const { result, currentStep } = get()
    if (!result || result.timesteps.length === 0) return 0
    return result.timesteps[currentStep]?.time ?? 0
  },

  getEventsUpToCurrentStep: () => {
    const { result, currentStep } = get()
    if (!result) return []
    return result.timesteps
      .slice(0, currentStep + 1)
      .flatMap((ts) => ts.events)
  },
}))
