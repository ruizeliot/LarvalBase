import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TerminalSession {
  id: string
  targetId: string
  targetType: 'worker' | 'supervisor'
  connected: boolean
}

interface TerminalState {
  sessions: TerminalSession[]
  supervisorSidebarOpen: boolean
  addSession: (session: TerminalSession) => void
  removeSession: (id: string) => void
  updateSession: (id: string, updates: Partial<TerminalSession>) => void
  toggleSupervisorSidebar: () => void
  setSupervisorSidebarOpen: (open: boolean) => void
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      sessions: [],
      supervisorSidebarOpen: false,
      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),
      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        })),
      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      toggleSupervisorSidebar: () =>
        set((state) => ({
          supervisorSidebarOpen: !state.supervisorSidebarOpen,
        })),
      setSupervisorSidebarOpen: (open) =>
        set({ supervisorSidebarOpen: open }),
    }),
    {
      name: 'terminal-storage',
      partialize: (state) => ({ supervisorSidebarOpen: state.supervisorSidebarOpen }),
    }
  )
)
