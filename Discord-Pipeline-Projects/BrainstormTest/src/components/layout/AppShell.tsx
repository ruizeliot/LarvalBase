import { useUiStore } from '@/store/uiStore'
import { TabBar } from './TabBar'
import { LeftPanel } from '@/components/panels/LeftPanel'
import { BottomPanel } from '@/components/panels/BottomPanel'
import { Canvas } from '@/components/canvas/Canvas'
import { ScenarioList } from '@/components/panels/ScenarioList'
import { ScenarioEditor } from '@/components/panels/ScenarioEditor'
import { SimulationControls } from '@/components/simulation/SimulationControls'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export function AppShell() {
  const activeMode = useUiStore((s) => s.activeMode)
  const leftPanelOpen = useUiStore((s) => s.leftPanelOpen)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)

  const isEditor = activeMode === 'editor'
  const isScenarios = activeMode === 'scenarios'
  const isSimulate = activeMode === 'simulate'

  return (
    <div className="flex flex-col h-full">
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {leftPanelOpen && (
          <div data-testid="left-panel" className="w-72 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto">
            {isEditor && <LeftPanel />}
            {isScenarios && <ScenarioList />}
            {isSimulate && <SimulationControls />}
          </div>
        )}
        {/* Main Area */}
        <div className="flex flex-col flex-1 relative">
          {/* Panel toggle */}
          <button
            data-testid="toggle-left-panel"
            onClick={toggleLeftPanel}
            className="absolute top-2 left-2 z-10 p-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            title={leftPanelOpen ? 'Hide panel' : 'Show panel'}
          >
            {leftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          {/* Main content */}
          <div className="flex-1">
            {isEditor && <Canvas />}
            {isScenarios && <ScenarioEditor />}
            {isSimulate && <SimulationResults />}
          </div>
          {/* Bottom Panel */}
          <BottomPanel />
        </div>
      </div>
    </div>
  )
}
