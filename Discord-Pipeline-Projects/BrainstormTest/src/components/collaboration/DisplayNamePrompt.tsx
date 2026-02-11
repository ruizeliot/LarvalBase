import { useState } from 'react'
import { useCollaborationStore } from '@/store/collaborationStore'

export function DisplayNamePrompt() {
  const showNamePrompt = useCollaborationStore((s) => s.showNamePrompt)
  const pendingRoomId = useCollaborationStore((s) => s.pendingRoomId)
  const confirmNameAndCreate = useCollaborationStore((s) => s.confirmNameAndCreate)
  const confirmNameAndJoin = useCollaborationStore((s) => s.confirmNameAndJoin)
  const closeNamePrompt = useCollaborationStore((s) => s.closeNamePrompt)

  const [name, setName] = useState('')
  const [validationError, setValidationError] = useState('')

  if (!showNamePrompt) return null

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setValidationError('Display name is required')
      return
    }
    setValidationError('')
    if (pendingRoomId) {
      confirmNameAndJoin(trimmed)
    } else {
      confirmNameAndCreate(trimmed)
      // Dispatch tutorial action for Phase 4 step 1
      document.dispatchEvent(
        new CustomEvent('tutorial-action', { detail: { actionType: 'create-room' } })
      )
    }
    setName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') {
      closeNamePrompt()
      setName('')
      setValidationError('')
    }
  }

  return (
    <div
      data-testid="display-name-prompt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) closeNamePrompt() }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 w-80 shadow-xl">
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-4">
          {pendingRoomId ? 'Join Collaboration Room' : 'Create Collaboration Room'}
        </h3>
        <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">
          Display Name
        </label>
        <input
          data-testid="display-name-input"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setValidationError('') }}
          onKeyDown={handleKeyDown}
          placeholder="Enter your name..."
          autoFocus
          className="w-full px-3 py-2 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {validationError && (
          <p data-testid="name-validation-error" className="text-xs text-[var(--color-accent-red)] mt-1">
            {validationError}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={closeNamePrompt}
            className="flex-1 px-3 py-2 rounded-md text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-name-button"
            onClick={handleConfirm}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
          >
            {pendingRoomId ? 'Join' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
