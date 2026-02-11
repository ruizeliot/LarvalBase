import { useEffect, useState } from 'react'
import { useCollaborationStore } from '@/store/collaborationStore'
import { X, Copy, Check } from 'lucide-react'

export function RoomModal() {
  const showRoomModal = useCollaborationStore((s) => s.showRoomModal)
  const shareUrl = useCollaborationStore((s) => s.shareUrl)
  const participants = useCollaborationStore((s) => s.participants)
  const closeRoomModal = useCollaborationStore((s) => s.closeRoomModal)

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!showRoomModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRoomModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showRoomModal, closeRoomModal])

  if (!showRoomModal) return null

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      // Dispatch tutorial action for Phase 4 step 2
      document.dispatchEvent(
        new CustomEvent('tutorial-action', { detail: { actionType: 'copy-link' } })
      )
    }
  }

  return (
    <div
      data-testid="room-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) closeRoomModal() }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 w-96 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            Collaboration Room
          </h3>
          <button
            data-testid="close-room-modal"
            onClick={closeRoomModal}
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Share URL */}
        <label className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
          Share Link
        </label>
        <div className="flex gap-2 mb-4">
          <div
            data-testid="room-url"
            className="flex-1 px-3 py-2 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-mono truncate select-all"
          >
            {shareUrl}
          </div>
          <button
            data-testid="copy-link-button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Participants */}
        <label className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
          Connected ({participants.length})
        </label>
        <div data-testid="participant-list" className="space-y-1.5">
          {participants.map((p) => (
            <div
              key={p.clientID}
              data-testid="participant-item"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-background)]"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-sm text-[var(--color-text)]">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
