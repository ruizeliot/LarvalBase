import { useUiStore, type AppMode } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Boxes, FileText, Play } from 'lucide-react'

const tabs: { mode: AppMode; label: string; icon: React.ReactNode; disabled: boolean }[] = [
  { mode: 'editor', label: 'Editor', icon: <Boxes size={16} />, disabled: false },
  { mode: 'scenarios', label: 'Scenarios', icon: <FileText size={16} />, disabled: false },
  { mode: 'simulate', label: 'Simulate', icon: <Play size={16} />, disabled: false },
]

export function TabBar() {
  const activeMode = useUiStore((s) => s.activeMode)
  const setActiveMode = useUiStore((s) => s.setActiveMode)

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
    </div>
  )
}
