import { useCallback, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
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
import { CompletionOverlay } from '@/components/tutorial/CompletionOverlay'
import { DisplayNamePrompt } from '@/components/collaboration/DisplayNamePrompt'
import { RoomModal } from '@/components/collaboration/RoomModal'
import { ConnectionError } from '@/components/collaboration/ConnectionError'
import { ActivityBar } from '@/components/collaboration/ActivityBar'
import { useCollaborationInit } from '@/hooks/useCollaborationInit'
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'

function ResultsSidePanel() {
  const resultsPanelOpen = useUiStore((s) => s.resultsPanelOpen)
  const resultsPanelWidth = useUiStore((s) => s.resultsPanelWidth)
  const toggleResultsPanel = useUiStore((s) => s.toggleResultsPanel)
  const setResultsPanelWidth = useUiStore((s) => s.setResultsPanelWidth)

  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const reactFlow = useReactFlow()

  const fitView = useCallback(() => {
    setTimeout(() => reactFlow.fitView({ padding: 0.1, duration: 200 }), 50)
  }, [reactFlow])

  // fitView when panel open/close state changes
  const prevOpen = useRef(resultsPanelOpen)
  useEffect(() => {
    if (prevOpen.current !== resultsPanelOpen) {
      fitView()
      prevOpen.current = resultsPanelOpen
    }
  }, [resultsPanelOpen, fitView])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = resultsPanelWidth

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartX.current - ev.clientX
      const newWidth = dragStartWidth.current + delta
      setResultsPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      fitView()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [resultsPanelWidth, setResultsPanelWidth, fitView])

  if (!resultsPanelOpen) {
    return (
      <div
        data-testid="results-side-panel"
        className="flex-shrink-0 w-10 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col"
      >
        <button
          data-testid="panel-collapse-toggle"
          onClick={toggleResultsPanel}
          className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          title="Show results"
        >
          <PanelRightOpen size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      data-testid="results-side-panel"
      className="flex-shrink-0 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] relative"
      style={{ width: resultsPanelWidth }}
    >
      {/* Draggable resize divider */}
      <div
        data-testid="panel-resize-divider"
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-[var(--color-primary)]/30 transition-colors"
        style={{ marginLeft: -3 }}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Results</span>
        <button
          data-testid="panel-collapse-toggle"
          onClick={toggleResultsPanel}
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          title="Hide results"
        >
          <PanelRightClose size={14} />
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <SimulationResults />
      </div>
    </div>
  )
}

export function AppShell() {
  const activeMode = useUiStore((s) => s.activeMode)
  const leftPanelOpen = useUiStore((s) => s.leftPanelOpen)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)
  const libraryPanelOpen = useUiStore((s) => s.libraryPanelOpen)

  useCollaborationInit()

  const reactFlow = useReactFlow()
  const prevLeftOpen = useRef(leftPanelOpen)
  useEffect(() => {
    if (prevLeftOpen.current !== leftPanelOpen) {
      setTimeout(() => reactFlow.fitView({ padding: 0.1, duration: 200 }), 50)
      prevLeftOpen.current = leftPanelOpen
    }
  }, [leftPanelOpen, reactFlow])

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
            {/* Simulation results — resizable right side panel */}
            {isSimulate && <ResultsSidePanel />}
          </div>
          {/* Activity Bar — only when in collaboration room */}
          <ActivityBar />
          {/* Bottom Panel */}
          <BottomPanel />
        </div>
      </div>
      <WelcomeOverlay />
      <GuidedTour />
      <ActionWatcher />
      <HelpButton />
      <CompletionOverlay />
      <DisplayNamePrompt />
      <RoomModal />
      <ConnectionError />
    </div>
  )
}
