import { useEffect } from 'react'
import { useCollaborationStore } from '@/store/collaborationStore'

/**
 * Detects ?room= URL parameter on mount and triggers the join flow.
 * Also registers Ctrl+Z / Ctrl+Y keyboard shortcuts for undo/redo.
 */
export function useCollaborationInit() {
  const connected = useCollaborationStore((s) => s.connected)
  const setPendingRoomId = useCollaborationStore((s) => s.setPendingRoomId)
  const undo = useCollaborationStore((s) => s.undo)
  const redo = useCollaborationStore((s) => s.redo)

  // Detect room URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('room')
    if (roomId && !connected) {
      setPendingRoomId(roomId)
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register Ctrl+Z / Ctrl+Y keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!useCollaborationStore.getState().connected) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
}
