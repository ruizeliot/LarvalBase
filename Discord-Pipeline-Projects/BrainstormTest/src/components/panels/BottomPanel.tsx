import { useUiStore } from '@/store/uiStore'
import { SlidersHorizontal, Clock, Play, List } from 'lucide-react'

export function BottomPanel() {
  const activeMode = useUiStore((s) => s.activeMode)

  return (
    <div
      data-testid="bottom-panel"
      className="h-28 flex-shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {activeMode === 'editor' && <EditorBottomContent />}
      {activeMode === 'scenarios' && <ScenariosBottomContent />}
      {activeMode === 'simulate' && <SimulateBottomContent />}
    </div>
  )
}

function EditorBottomContent() {
  return (
    <div data-testid="bottom-panel-editor" className="flex items-center gap-3 h-full px-4">
      <SlidersHorizontal size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-[var(--color-text)]">Property Details</p>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Select a component or causal chain to view details
        </p>
      </div>
    </div>
  )
}

function ScenariosBottomContent() {
  return (
    <div data-testid="bottom-panel-scenarios" className="flex items-center gap-3 h-full px-4">
      <Clock size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-[var(--color-text)]">Timeline</p>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Scenario event timeline will appear here
        </p>
      </div>
    </div>
  )
}

function SimulateBottomContent() {
  return (
    <div data-testid="bottom-panel-simulate" className="flex items-center h-full px-4">
      <div className="flex items-center gap-3 flex-1">
        <Play size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-[var(--color-text)]">Playback Controls</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Simulation playback controls will appear here
          </p>
        </div>
      </div>
      <div className="border-l border-[var(--color-border)] h-full" />
      <div className="flex items-center gap-3 flex-1 pl-4">
        <List size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-[var(--color-text)]">Event Log</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Cascade events will be logged here during simulation
          </p>
        </div>
      </div>
    </div>
  )
}
