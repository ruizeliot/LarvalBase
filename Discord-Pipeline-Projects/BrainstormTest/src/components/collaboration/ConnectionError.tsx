import { useCollaborationStore } from '@/store/collaborationStore'
import { WifiOff } from 'lucide-react'

export function ConnectionError() {
  const error = useCollaborationStore((s) => s.error)
  const connecting = useCollaborationStore((s) => s.connecting)
  const workOffline = useCollaborationStore((s) => s.workOffline)

  if (!error && !connecting) return null

  if (connecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 w-80 shadow-xl text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text)]">Connecting to room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        data-testid="connection-error"
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 w-80 shadow-xl text-center"
      >
        <WifiOff size={32} className="mx-auto mb-3 text-[var(--color-accent-red)]" />
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
          Connection Failed
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {error}
        </p>
        <button
          data-testid="work-offline-button"
          onClick={workOffline}
          className="w-full px-4 py-2 rounded-md text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
        >
          Work Offline
        </button>
      </div>
    </div>
  )
}
