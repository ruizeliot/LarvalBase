import { useState } from 'react'
import { useCollaborationStore, type Participant } from '@/store/collaborationStore'
import { getYDoc } from '@/lib/collaboration'

function PresenceAvatar({
  participant,
  isSelf,
}: {
  participant: Participant
  isSelf: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const initial = participant.name.charAt(0).toUpperCase()

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        data-testid="presence-avatar"
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-default transition-transform hover:scale-110"
        style={{ backgroundColor: participant.color }}
        title={isSelf ? `${participant.name} (You)` : participant.name}
      >
        {initial}
      </div>
      {showTooltip && (
        <div
          data-testid="presence-tooltip"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded text-xs whitespace-nowrap z-50 shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          {isSelf ? `${participant.name} (You)` : participant.name}
        </div>
      )}
    </div>
  )
}

export function PresenceBar() {
  const connected = useCollaborationStore((s) => s.connected)
  const participants = useCollaborationStore((s) => s.participants)

  if (!connected) return null

  const yDoc = getYDoc()
  const localClientID = yDoc?.clientID

  // Sort: own avatar first, then others
  const sorted = [...participants].sort((a, b) => {
    if (a.clientID === localClientID) return -1
    if (b.clientID === localClientID) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div
      data-testid="presence-bar"
      className="flex items-center gap-1.5"
    >
      <div className="flex items-center -space-x-1">
        {sorted.map((p) => (
          <PresenceAvatar
            key={p.clientID}
            participant={p}
            isSelf={p.clientID === localClientID}
          />
        ))}
      </div>
      <span
        data-testid="participant-count"
        className="text-xs font-medium px-1.5 py-0.5 rounded-full"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
        }}
      >
        {participants.length}
      </span>
    </div>
  )
}
