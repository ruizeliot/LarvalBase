import { create } from 'zustand'
import {
  TUTORIAL_PROGRESS_KEY,
  OLD_TUTORIAL_KEY,
  DEFAULT_PROGRESS,
  TUTORIAL_PHASES,
  getPhase,
  type TutorialProgress,
  type PhaseProgress,
  type PhaseStatus,
} from '@/components/tutorial/tutorialConfig'

interface TutorialState {
  // Persisted progress
  progress: TutorialProgress

  // Active tour state (transient)
  tourActive: boolean
  activePhase: number | null
  currentStep: number
  completedActions: Set<number>

  // Actions
  loadProgress: () => void
  saveProgress: () => void
  startPhase: (phase: number) => void
  resumePhase: (phase: number) => void
  replayPhase: (phase: number) => void
  setStep: (step: number) => void
  completeAction: (stepIndex: number) => void
  completeCurrentPhase: () => void
  endTour: () => void
  resetAllProgress: () => void
  migrateFromV2: () => void
  markWelcomeSeen: () => void

  // Computed helpers
  getPhaseProgress: (phase: number) => PhaseProgress
  getPhaseStatus: (phase: number) => PhaseStatus
  isPhaseUnlocked: (phase: number) => boolean
  getCompletedPhaseCount: () => number

  // Legacy compatibility
  startTour: () => void
}

function getPhaseKey(phase: number): keyof TutorialProgress {
  return `phase${phase}` as keyof TutorialProgress
}

function loadFromLocalStorage(): TutorialProgress {
  try {
    const raw = localStorage.getItem(TUTORIAL_PROGRESS_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const parsed = JSON.parse(raw) as TutorialProgress
    return {
      phase1: parsed.phase1 ?? { ...DEFAULT_PROGRESS.phase1 },
      phase2: parsed.phase2 ?? { ...DEFAULT_PROGRESS.phase2 },
      phase3: parsed.phase3 ?? { ...DEFAULT_PROGRESS.phase3 },
      phase4: parsed.phase4 ?? { ...DEFAULT_PROGRESS.phase4 },
      welcomeSeen: parsed.welcomeSeen ?? false,
    }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

function saveToLocalStorage(progress: TutorialProgress) {
  localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(progress))
}

function computePhaseStatuses(progress: TutorialProgress): TutorialProgress {
  const updated = { ...progress }

  // Phase 1 is always at least available
  if (updated.phase1.status === 'locked') {
    updated.phase1 = { ...updated.phase1, status: 'available' }
  }

  // Phases 2-4 unlock when previous phase is complete
  for (let i = 2; i <= 4; i++) {
    const prevKey = getPhaseKey(i - 1)
    const currKey = getPhaseKey(i)
    const prev = updated[prevKey] as PhaseProgress
    const curr = updated[currKey] as PhaseProgress

    if (prev.status === 'complete' && curr.status === 'locked') {
      (updated as Record<string, unknown>)[currKey] = { ...curr, status: 'available' }
    }
  }

  return updated
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  progress: loadFromLocalStorage(),
  tourActive: false,
  activePhase: null,
  currentStep: 0,
  completedActions: new Set(),

  loadProgress: () => {
    const progress = computePhaseStatuses(loadFromLocalStorage())
    set({ progress })
  },

  saveProgress: () => {
    saveToLocalStorage(get().progress)
  },

  startPhase: (phase: number) => {
    const { progress } = get()
    const key = getPhaseKey(phase)
    const phaseProgress = progress[key] as PhaseProgress

    if (phaseProgress.status === 'locked') return

    const updated = {
      ...progress,
      [key]: { ...phaseProgress, status: 'in-progress' as PhaseStatus, stepsCompleted: [] },
    }
    const computed = computePhaseStatuses(updated)
    saveToLocalStorage(computed)

    set({
      progress: computed,
      tourActive: true,
      activePhase: phase,
      currentStep: 0,
      completedActions: new Set(),
    })
  },

  resumePhase: (phase: number) => {
    const { progress } = get()
    const key = getPhaseKey(phase)
    const phaseProgress = progress[key] as PhaseProgress

    if (phaseProgress.status === 'locked') return

    const nextStep = phaseProgress.stepsCompleted.length > 0
      ? Math.max(...phaseProgress.stepsCompleted) + 1
      : 0

    const phaseConfig = getPhase(phase)
    const totalSteps = phaseConfig?.steps.length ?? 0
    const startStep = nextStep >= totalSteps ? 0 : nextStep

    set({
      tourActive: true,
      activePhase: phase,
      currentStep: startStep,
      completedActions: new Set(phaseProgress.stepsCompleted.map((s) => s - 1)),
    })
  },

  replayPhase: (phase: number) => {
    const { progress } = get()
    const key = getPhaseKey(phase)
    const phaseProgress = progress[key] as PhaseProgress

    if (phaseProgress.status === 'locked') return

    set({
      tourActive: true,
      activePhase: phase,
      currentStep: 0,
      completedActions: new Set(),
    })
  },

  setStep: (step: number) => set({ currentStep: step }),

  completeAction: (stepIndex: number) => {
    const { activePhase, progress } = get()
    if (!activePhase) return

    const key = getPhaseKey(activePhase)
    const phaseProgress = progress[key] as PhaseProgress

    // stepIndex is 0-based, stepsCompleted stores 1-based step numbers
    const stepNumber = stepIndex + 1
    const newCompleted = [...new Set([...phaseProgress.stepsCompleted, stepNumber])].sort((a, b) => a - b)

    const newSet = new Set(get().completedActions)
    newSet.add(stepIndex)

    const updated = {
      ...progress,
      [key]: { ...phaseProgress, status: 'in-progress' as PhaseStatus, stepsCompleted: newCompleted },
    }

    saveToLocalStorage(updated)
    set({ completedActions: newSet, progress: updated })
  },

  completeCurrentPhase: () => {
    const { activePhase, progress } = get()
    if (!activePhase) return

    const key = getPhaseKey(activePhase)
    const phaseConfig = getPhase(activePhase)
    const allSteps = phaseConfig ? phaseConfig.steps.map((_, i) => i + 1) : []

    const updated = {
      ...progress,
      [key]: { status: 'complete' as PhaseStatus, stepsCompleted: allSteps },
    }

    const computed = computePhaseStatuses(updated)
    saveToLocalStorage(computed)
    set({ progress: computed, tourActive: false, activePhase: null, currentStep: 0, completedActions: new Set() })
  },

  endTour: () => {
    const { activePhase, progress, completedActions } = get()

    // Save mid-phase progress before ending
    if (activePhase) {
      const key = getPhaseKey(activePhase)
      const phaseProgress = progress[key] as PhaseProgress

      // Convert 0-based completedActions to 1-based stepsCompleted
      const stepNumbers = Array.from(completedActions).map((s) => s + 1)
      const merged = [...new Set([...phaseProgress.stepsCompleted, ...stepNumbers])].sort((a, b) => a - b)

      const phaseConfig = getPhase(activePhase)
      const totalSteps = phaseConfig?.steps.length ?? 0
      const isComplete = merged.length >= totalSteps
      const status: PhaseStatus = isComplete ? 'complete' : merged.length > 0 ? 'in-progress' : phaseProgress.status

      const updated = {
        ...progress,
        [key]: { status, stepsCompleted: merged },
      }
      const computed = computePhaseStatuses(updated)
      saveToLocalStorage(computed)
      set({ progress: computed })
    }

    set({ tourActive: false, activePhase: null, currentStep: 0, completedActions: new Set() })
  },

  resetAllProgress: () => {
    const fresh = { ...DEFAULT_PROGRESS }
    saveToLocalStorage(fresh)
    set({ progress: fresh, tourActive: false, activePhase: null, currentStep: 0, completedActions: new Set() })
  },

  migrateFromV2: () => {
    const oldKey = localStorage.getItem(OLD_TUTORIAL_KEY)
    if (!oldKey) return

    const existing = loadFromLocalStorage()

    // Only migrate if the new progress doesn't already have Phase 1 complete
    if (existing.phase1.status !== 'complete') {
      const allSteps = getPhase(1)?.steps.map((_, i) => i + 1) ?? []
      existing.phase1 = { status: 'complete', stepsCompleted: allSteps }
      existing.welcomeSeen = true
    }

    const computed = computePhaseStatuses(existing)
    saveToLocalStorage(computed)
    localStorage.removeItem(OLD_TUTORIAL_KEY)
    set({ progress: computed })
  },

  markWelcomeSeen: () => {
    const { progress } = get()
    const updated = { ...progress, welcomeSeen: true }
    saveToLocalStorage(updated)
    set({ progress: updated })
  },

  getPhaseProgress: (phase: number): PhaseProgress => {
    const key = getPhaseKey(phase)
    return get().progress[key] as PhaseProgress
  },

  getPhaseStatus: (phase: number): PhaseStatus => {
    return get().getPhaseProgress(phase).status
  },

  isPhaseUnlocked: (phase: number): boolean => {
    const status = get().getPhaseStatus(phase)
    return status !== 'locked'
  },

  getCompletedPhaseCount: (): number => {
    const { progress } = get()
    let count = 0
    for (let i = 1; i <= TUTORIAL_PHASES.length; i++) {
      const key = getPhaseKey(i)
      if ((progress[key] as PhaseProgress).status === 'complete') count++
    }
    return count
  },

  // Legacy compat — starts Phase 1
  startTour: () => {
    get().startPhase(1)
  },
}))
