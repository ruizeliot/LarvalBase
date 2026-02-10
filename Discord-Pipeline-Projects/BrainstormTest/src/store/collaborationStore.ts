import { create } from 'zustand'
import * as collab from '@/lib/collaboration'

export interface Participant {
  clientID: number
  name: string
  color: string
}

interface CollaborationState {
  roomId: string | null
  shareUrl: string | null
  connected: boolean
  connecting: boolean
  displayName: string | null
  participants: Participant[]
  error: string | null

  // Modal states
  showNamePrompt: boolean
  showRoomModal: boolean
  pendingRoomId: string | null // set when joining via URL param

  // Undo/redo
  canUndo: boolean
  canRedo: boolean

  // Actions
  startCollaboration: () => void
  confirmNameAndCreate: (name: string) => void
  confirmNameAndJoin: (name: string) => Promise<void>
  setPendingRoomId: (roomId: string) => void
  closeNamePrompt: () => void
  closeRoomModal: () => void
  disconnect: () => void
  workOffline: () => void
  undo: () => void
  redo: () => void
  refreshUndoRedoState: () => void
  setParticipants: (participants: Participant[]) => void
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  roomId: null,
  shareUrl: null,
  connected: false,
  connecting: false,
  displayName: null,
  participants: [],
  error: null,

  showNamePrompt: false,
  showRoomModal: false,
  pendingRoomId: null,

  canUndo: false,
  canRedo: false,

  startCollaboration: () => {
    set({ showNamePrompt: true, pendingRoomId: null, error: null })
  },

  confirmNameAndCreate: (name: string) => {
    const { roomId, shareUrl } = collab.createRoom(name)
    set({
      roomId,
      shareUrl,
      connected: true,
      connecting: false,
      displayName: name,
      showNamePrompt: false,
      showRoomModal: true,
      error: null,
    })
    // Start awareness polling
    startAwarenessPolling()
  },

  confirmNameAndJoin: async (name: string) => {
    const { pendingRoomId } = get()
    if (!pendingRoomId) return
    set({ connecting: true, showNamePrompt: false, error: null })

    try {
      await collab.joinRoom(pendingRoomId, name)
      const url = new URL(window.location.href)
      url.searchParams.set('room', pendingRoomId)
      set({
        roomId: pendingRoomId,
        shareUrl: url.toString(),
        connected: true,
        connecting: false,
        displayName: name,
        pendingRoomId: null,
        error: null,
      })
      startAwarenessPolling()
    } catch (err) {
      set({
        connecting: false,
        error: (err as Error).message || 'Unable to connect to room',
      })
    }
  },

  setPendingRoomId: (roomId: string) => {
    set({ pendingRoomId: roomId, showNamePrompt: true, error: null })
  },

  closeNamePrompt: () => {
    set({ showNamePrompt: false, pendingRoomId: null })
  },

  closeRoomModal: () => {
    set({ showRoomModal: false })
  },

  disconnect: () => {
    collab.disconnect()
    stopAwarenessPolling()
    set({
      roomId: null,
      shareUrl: null,
      connected: false,
      connecting: false,
      displayName: null,
      participants: [],
      error: null,
      showRoomModal: false,
      canUndo: false,
      canRedo: false,
    })
    // Remove room param from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  },

  workOffline: () => {
    collab.disconnect()
    stopAwarenessPolling()
    set({
      roomId: null,
      shareUrl: null,
      connected: false,
      connecting: false,
      pendingRoomId: null,
      error: null,
      showNamePrompt: false,
    })
    // Remove room param from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  },

  undo: () => {
    collab.undo()
    get().refreshUndoRedoState()
  },

  redo: () => {
    collab.redo()
    get().refreshUndoRedoState()
  },

  refreshUndoRedoState: () => {
    set({
      canUndo: collab.canUndo(),
      canRedo: collab.canRedo(),
    })
  },

  setParticipants: (participants: Participant[]) => {
    set({ participants })
  },
}))

// --- Awareness polling ---
let awarenessInterval: ReturnType<typeof setInterval> | null = null

function startAwarenessPolling() {
  stopAwarenessPolling()
  const update = () => {
    const participants = collab.getParticipants()
    useCollaborationStore.getState().setParticipants(participants)
    useCollaborationStore.getState().refreshUndoRedoState()
  }
  update()
  awarenessInterval = setInterval(update, 500)

  // Also listen to awareness changes
  const provider = collab.getProvider()
  if (provider) {
    provider.awareness.on('change', update)
  }
}

function stopAwarenessPolling() {
  if (awarenessInterval) {
    clearInterval(awarenessInterval)
    awarenessInterval = null
  }
}
