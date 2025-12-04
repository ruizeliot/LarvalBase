import { create } from 'zustand'
import type { Pipeline } from '../types'

interface PipelineState {
  pipelines: Pipeline[]
  currentPipeline: Pipeline | null
  setPipelines: (pipelines: Pipeline[]) => void
  setCurrentPipeline: (pipeline: Pipeline | null) => void
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void
}

export const usePipelineStore = create<PipelineState>()((set) => ({
  pipelines: [],
  currentPipeline: null,
  setPipelines: (pipelines) => set({ pipelines }),
  setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
  updatePipeline: (id, updates) =>
    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      currentPipeline:
        state.currentPipeline?.id === id
          ? { ...state.currentPipeline, ...updates }
          : state.currentPipeline,
    })),
}))
