import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useViewport } from '@xyflow/react'
import { getRemoteCursors, onAwarenessChange, type RemoteCursor } from '@/lib/collaboration'
import { useCollaborationStore } from '@/store/collaborationStore'

function CursorArrow({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0L16 12L8 12L6 20L0 0Z" />
    </svg>
  )
}

function RemoteCursorDisplay({ cursor }: { cursor: RemoteCursor }) {
  const { x: vx, y: vy, zoom } = useViewport()

  // Convert flow coordinates to screen-relative coordinates within the canvas
  const screenX = cursor.cursor.x * zoom + vx
  const screenY = cursor.cursor.y * zoom + vy

  return (
    <div
      data-testid="remote-cursor"
      className="absolute pointer-events-none z-50"
      style={{
        left: screenX,
        top: screenY,
        transition: 'left 0.1s linear, top 0.1s linear',
      }}
    >
      <CursorArrow color={cursor.color} />
      <span
        className="ml-3 -mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
        style={{
          backgroundColor: cursor.color,
          color: '#fff',
        }}
      >
        {cursor.name}
      </span>
    </div>
  )
}

export function LiveCursors() {
  const connected = useCollaborationStore((s) => s.connected)
  const participants = useCollaborationStore((s) => s.participants)
  const [rawCursors, setRawCursors] = useState<RemoteCursor[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)

  const updateCursors = useCallback(() => {
    setRawCursors(getRemoteCursors())
  }, [])

  useEffect(() => {
    if (!connected) {
      setRawCursors([])
      return
    }

    // Initial fetch
    updateCursors()

    // Subscribe to awareness changes
    cleanupRef.current = onAwarenessChange(updateCursors)

    // Also poll as fallback
    const interval = setInterval(updateCursors, 200)

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
      clearInterval(interval)
    }
  }, [connected, updateCursors])

  // Filter cursors to only show those from active participants
  const cursors = useMemo(() => {
    const participantIds = new Set(participants.map((p) => p.clientID))
    return rawCursors.filter((c) => participantIds.has(c.clientID))
  }, [rawCursors, participants])

  if (!connected || cursors.length === 0) return null

  return (
    <>
      {cursors.map((c) => (
        <RemoteCursorDisplay key={c.clientID} cursor={c} />
      ))}
    </>
  )
}
