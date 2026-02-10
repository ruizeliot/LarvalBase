import { useUiStore, type AppMode } from '@/store/uiStore'
import { useCollaborationStore } from '@/store/collaborationStore'
import { cn } from '@/lib/utils'
import { Boxes, FileText, Play, BookOpen, Users, Undo2, Redo2 } from 'lucide-react'

const tabs: { mode: AppMode; label: string; icon: React.ReactNode; disabled: boolean }[] = [
  { mode: 'editor', label: 'Editor', icon: <Boxes size={16} />, disabled: false },
  { mode: 'scenarios', label: 'Scenarios', icon: <FileText size={16} />, disabled: false },
  { mode: 'simulate', label: 'Simulate', icon: <Play size={16} />, disabled: false },
]

export function TabBar() {
  const activeMode = useUiStore((s) => s.activeMode)
  const setActiveMode = useUiStore((s) => s.setActiveMode)
  const openLibraryPanel = useUiStore((s) => s.openLibraryPanel)

  const connected = useCollaborationStore((s) => s.connected)
  const startCollaboration = useCollaborationStore((s) => s.startCollaboration)
  const canUndo = useCollaborationStore((s) => s.canUndo)
  const canRedo = useCollaborationStore((s) => s.canRedo)
  const undo = useCollaborationStore((s) => s.undo)
  const redo = useCollaborationStore((s) => s.redo)
  const showRoomModal = useCollaborationStore((s) => s.showRoomModal)
  const closeRoomModal = useCollaborationStore((s) => s.closeRoomModal)

  const handleCollaborateClick = () => {
    if (connected) {
      // Already in a room — toggle the share modal
      if (showRoomModal) {
        closeRoomModal()
      } else {
        useCollaborationStore.setState({ showRoomModal: true })
      }
    } else {
      startCollaboration()
    }
  }

  return (
    <div className="flex items-center h-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-2 gap-1">
      <span className="text-sm font-semibold text-[var(--color-primary)] mr-4 px-2">
        CascadeSim
      </span>
      {tabs.map((tab) => (
        <button
          key={tab.mode}
          data-testid={`tab-${tab.mode}`}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && setActiveMode(tab.mode)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
            activeMode === tab.mode
              ? 'bg-[var(--color-primary)] text-white'
              : tab.disabled
                ? 'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] cursor-pointer'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
      <div className="flex-1" />

      {/* Undo/Redo buttons — only when in a collaboration room */}
      {connected && (
        <div className="flex items-center gap-0.5 mr-2">
          <button
            data-testid="undo-button"
            onClick={undo}
            disabled={!canUndo}
            className={cn(
              'p-1.5 rounded-md text-sm transition-colors',
              canUndo
                ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] cursor-pointer'
                : 'text-[var(--color-text-muted)] opacity-30 cursor-not-allowed'
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            data-testid="redo-button"
            onClick={redo}
            disabled={!canRedo}
            className={cn(
              'p-1.5 rounded-md text-sm transition-colors',
              canRedo
                ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] cursor-pointer'
                : 'text-[var(--color-text-muted)] opacity-30 cursor-not-allowed'
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>
      )}

      <button
        data-testid="library-button"
        onClick={openLibraryPanel}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
      >
        <BookOpen size={16} />
        Library
      </button>
      <button
        data-testid="collaborate-button"
        onClick={handleCollaborateClick}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
          connected
            ? 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/30'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
        )}
      >
        <Users size={16} />
        {connected ? 'Share' : 'Collaborate'}
      </button>
    </div>
  )
}
