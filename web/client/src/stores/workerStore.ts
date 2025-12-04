import { create } from 'zustand'
import type { Worker, Token } from '../types'

interface WorkerState {
  workers: Worker[]
  tokens: Token[]
  setWorkers: (workers: Worker[]) => void
  setTokens: (tokens: Token[]) => void
  updateWorker: (id: string, updates: Partial<Worker>) => void
  addToken: (token: Token) => void
  revokeToken: (id: string) => void
}

export const useWorkerStore = create<WorkerState>()((set) => ({
  workers: [],
  tokens: [],
  setWorkers: (workers) => set({ workers }),
  setTokens: (tokens) => set({ tokens }),
  updateWorker: (id, updates) =>
    set((state) => ({
      workers: state.workers.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),
  addToken: (token) =>
    set((state) => ({
      tokens: [...state.tokens, token],
    })),
  revokeToken: (id) =>
    set((state) => ({
      tokens: state.tokens.map((t) =>
        t.id === id ? { ...t, revoked: true } : t
      ),
    })),
}))
