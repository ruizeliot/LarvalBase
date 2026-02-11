import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewport } from '@xyflow/react'
import { getRemoteSelections, onAwarenessChange, type RemoteSelection } from '@/lib/collaboration'
import { useCollaborationStore } from '@/store/collaborationStore'
import { useModelStore } from '@/store/modelStore'

function EditIndicatorOverlay({ selection }: { selection: RemoteSelection & { position: { x: number; y: number } } }) {
  const { x: vx, y: vy, zoom } = useViewport()

  // Convert flow coordinates to screen coordinates
  const screenX = selection.position.x * zoom + vx
  const screenY = selection.position.y * zoom + vy

  return (
    <div
      data-testid="edit-indicator"
      className="absolute pointer-events-none z-40"
      style={{
        left: screenX - 4,
        top: screenY - 4,
        width: 168 * zoom,
        height: 68 * zoom,
        borderRadius: 8,
        border: `2px solid ${selection.color}`,
        borderColor: selection.color,
        boxShadow: `0 0 8px ${selection.color}40`,
      }}
    >
      <span
        className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
        style={{
          backgroundColor: selection.color,
          color: '#fff',
        }}
      >
        {selection.name} is editing
      </span>
    </div>
  )
}

export function EditIndicators() {
  const connected = useCollaborationStore((s) => s.connected)
  const [selections, setSelections] = useState<RemoteSelection[]>([])
  const components = useModelStore((s) => s.components)
  const cleanupRef = useRef<(() => void) | null>(null)

  const updateSelections = useCallback(() => {
    setSelections(getRemoteSelections())
  }, [])

  useEffect(() => {
    if (!connected) {
      setSelections([])
      return
    }

    updateSelections()
    cleanupRef.current = onAwarenessChange(updateSelections)
    const interval = setInterval(updateSelections, 200)

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
      clearInterval(interval)
    }
  }, [connected, updateSelections])

  if (!connected || selections.length === 0) return null

  // Only render indicators for nodes that exist in the model
  const validSelections = selections
    .filter((s) => components[s.nodeId])
    .map((s) => ({
      ...s,
      position: components[s.nodeId].position,
    }))

  if (validSelections.length === 0) return null

  return (
    <>
      {validSelections.map((s) => (
        <EditIndicatorOverlay key={s.clientID} selection={s} />
      ))}
    </>
  )
}
