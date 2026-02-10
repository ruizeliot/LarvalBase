import { create } from 'zustand'

interface TutorialState {
  tourActive: boolean
  currentStep: number
  completedActions: Set<number>

  startTour: () => void
  endTour: () => void
  setStep: (step: number) => void
  completeAction: (step: number) => void
  isActionCompleted: (step: number) => boolean
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  tourActive: false,
  currentStep: 0,
  completedActions: new Set(),

  startTour: () => set({ tourActive: true, currentStep: 0, completedActions: new Set() }),
  endTour: () => set({ tourActive: false, currentStep: 0 }),
  setStep: (step) => set({ currentStep: step }),
  completeAction: (step) => set((s) => {
    const newSet = new Set(s.completedActions)
    newSet.add(step)
    return { completedActions: newSet }
  }),
  isActionCompleted: (step) => get().completedActions.has(step),
}))
