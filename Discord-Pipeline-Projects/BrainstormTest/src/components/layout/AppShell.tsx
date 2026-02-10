import { useState } from 'react'
import { useUiStore } from '@/store/uiStore'
import { TabBar } from './TabBar'
import { LeftPanel } from '@/components/panels/LeftPanel'
import { BottomPanel } from '@/components/panels/BottomPanel'
import { Canvas } from '@/components/canvas/Canvas'
import { ScenarioList } from '@/components/panels/ScenarioList'
import { ScenarioEditor } from '@/components/panels/ScenarioEditor'
import { SimulationControls } from '@/components/simulation/SimulationControls'
import { ChainStatusPanel } from '@/components/simulation/ChainStatusPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { ScenarioLibraryPanel } from '@/components/library/ScenarioLibraryPanel'
import { WelcomeOverlay } from '@/components/tutorial/WelcomeOverlay'
import { GuidedTour } from '@/components/tutorial/GuidedTour'
import { ActionWatcher } from '@/components/tutorial/ActionWatcher'
import { HelpButton } from '@/components/tutorial/HelpButton'
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'

export function AppShell() {
  const activeMode = useUiStore((s) => s.activeMode)
  const leftPanelOpen = useUiStore((s) => s.leftPanelOpen)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)
  const libraryPanelOpen = useUiStore((s) => s.libraryPanelOpen)
  const [resultsPanelOpen, setResultsPanelOpen] = useState(true)

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
            {isSimulate && (
              <>
                <SimulationControls />
                <ChainStatusPanel />
              </>
            )}
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
          {/* Main content — Canvas is always rendered for persistence */}
          <div className="flex-1 relative min-h-0 flex">
            <div className="flex-1 relative">
              <div className={`absolute inset-0 ${isScenarios ? 'pointer-events-none' : ''}`}>
                <Canvas />
              </div>
              {/* Scenario editor overlay */}
              {isScenarios && (
                <div className="absolute inset-0 bg-[var(--color-background)]/80 overflow-y-auto z-[5]">
                  <ScenarioEditor />
                </div>
              )}
              {/* Library panel overlay */}
              {libraryPanelOpen && <ScenarioLibraryPanel />}
            </div>
            {/* Simulation results — collapsible right panel (not overlay) */}
            {isSimulate && (
              <div
                data-testid="results-panel"
                className={`flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col ${resultsPanelOpen ? 'w-96' : 'w-10'}`}
              >
                {resultsPanelOpen ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
                      <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Results</span>
                      <button
                        data-testid="toggle-results-panel"
                        onClick={() => setResultsPanelOpen(false)}
                        className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                        title="Hide results"
                      >
                        <PanelRightClose size={14} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SimulationResults />
                    </div>
                  </>
                ) : (
                  <button
                    data-testid="toggle-results-panel"
                    onClick={() => setResultsPanelOpen(true)}
                    className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                    title="Show results"
                  >
                    <PanelRightOpen size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Bottom Panel */}
          <BottomPanel />
        </div>
      </div>
      <WelcomeOverlay />
      <GuidedTour />
      <ActionWatcher />
      <HelpButton />
    </div>
  )
}
