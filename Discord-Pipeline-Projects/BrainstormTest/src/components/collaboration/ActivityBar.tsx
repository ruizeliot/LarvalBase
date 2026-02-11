import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getActivities, onActivitiesChange, type ActivityEntry } from '@/lib/collaboration'
import { useCollaborationStore } from '@/store/collaborationStore'

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function ActivityEntryRow({ entry }: { entry: ActivityEntry }) {
  const [, setTick] = useState(0)

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const age = (Date.now() - entry.timestamp) / 1000
  const opacity = age > 30 ? 0.5 : 1

  return (
    <div
      data-testid="activity-entry"
      className="flex items-center gap-2 px-3 py-1 text-xs"
      style={{ opacity }}
    >
      <div
        data-testid="activity-color-dot"
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: entry.userColor }}
      />
      <span className="font-medium text-[var(--color-text)]">{entry.userName}</span>
      <span className="text-[var(--color-text-muted)]">
        {entry.action} {entry.entityName}
      </span>
      <span className="ml-auto text-[var(--color-text-muted)] opacity-60 whitespace-nowrap">
        {formatRelativeTime(entry.timestamp)}
      </span>
    </div>
  )
}

export function ActivityBar() {
  const connected = useCollaborationStore((s) => s.connected)
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const updateActivities = useCallback(() => {
    setActivities(getActivities())
  }, [])

  useEffect(() => {
    if (!connected) {
      setActivities([])
      return
    }

    updateActivities()
    cleanupRef.current = onActivitiesChange(updateActivities)
    const interval = setInterval(updateActivities, 500)

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
      clearInterval(interval)
    }
  }, [connected, updateActivities])

  if (!connected) return null

  return (
    <div
      data-testid="activity-bar"
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Activity
        </span>
        <button
          data-testid="activity-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Activity list */}
      {!collapsed && (
        <div data-testid="activity-list" className="max-h-32 overflow-y-auto pb-1">
          {activities.length === 0 ? (
            <div className="px-3 py-1 text-xs text-[var(--color-text-muted)] italic">
              No activity yet
            </div>
          ) : (
            activities.map((entry) => (
              <ActivityEntryRow key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
