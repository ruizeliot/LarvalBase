import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useModelStore } from '@/store/modelStore'
import { useUiStore } from '@/store/uiStore'
import { useSimulationStore } from '@/store/simulationStore'
import { ComponentNode } from './nodes/ComponentNode'
import { ConditionNode } from './nodes/ConditionNode'
import { InfoCardNode } from './nodes/InfoCardNode'
import { ContextMenu } from './ContextMenu'
import { ChainBuilder } from '@/components/chain-builder/ChainBuilder'
import { CausalEdge } from './edges/CausalEdge'
import { ImpactEdge } from './edges/ImpactEdge'
import { evaluateChainStages } from '@/engine/chainStageEvaluator'
import {
  getActiveInfoCards,
  subscribeInfoCards,
  getDismissedInfoCards,
  subscribeDismissed,
  dismissInfoCard,
  restoreAllInfoCards,
} from '@/components/library/ScenarioLibraryPanel'
import { Eye, EyeOff, LayoutGrid } from 'lucide-react'
import type { ComponentType } from '@/types/model'
import { computeElkLayout, type LayoutDirection } from '@/lib/elkLayout'
import { LiveCursors } from '@/components/collaboration/LiveCursors'
import { setCursorPosition } from '@/lib/collaboration'
import { useCollaborationStore } from '@/store/collaborationStore'

const nodeTypes: NodeTypes = {
  component: ComponentNode,
  condition: ConditionNode,
  infoCard: InfoCardNode,
}

const edgeTypes: EdgeTypes = {
  causal: CausalEdge,
  impact: ImpactEdge,
}

function CanvasInner() {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const components = useModelStore((s) => s.components)
  const chains = useModelStore((s) => s.chains)
  const addComponent = useModelStore((s) => s.addComponent)
  const removeComponent = useModelStore((s) => s.removeComponent)
  const updateComponentPosition = useModelStore((s) => s.updateComponentPosition)
  const selectNode = useUiStore((s) => s.selectNode)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const openContextMenu = useUiStore((s) => s.openContextMenu)
  const closeContextMenu = useUiStore((s) => s.closeContextMenu)
  const chainViewMode = useUiStore((s) => s.chainViewMode)
  const toggleChainViewMode = useUiStore((s) => s.toggleChainViewMode)
  const activeMode = useUiStore((s) => s.activeMode)
  const showInfoCards = useUiStore((s) => s.showInfoCards)
  const toggleInfoCards = useUiStore((s) => s.toggleInfoCards)

  // Subscribe to info card changes
  const infoCards = useSyncExternalStore(subscribeInfoCards, getActiveInfoCards)
  const dismissedCards = useSyncExternalStore(subscribeDismissed, () => getDismissedInfoCards())

  // Simulation state for pulses and parameter updates
  const playbackState = useSimulationStore((s) => s.playbackState)
  const currentStep = useSimulationStore((s) => s.currentStep)
  const simResult = useSimulationStore((s) => s.result)

  // Compute chain stages from current simulation snapshot
  const chainStages = useMemo(() => {
    if (activeMode !== 'simulate' || !simResult || simResult.timesteps.length === 0) return {}
    const snapshot = simResult.timesteps[currentStep]?.snapshot ?? {}
    return evaluateChainStages(components, chains, snapshot)
  }, [activeMode, simResult, currentStep, components, chains])

  const isSimulating = activeMode === 'simulate' && simResult != null

  const handleDismissInfoCard = useCallback((id: string) => {
    dismissInfoCard(id)
  }, [])

  const handleToggleInfoCards = useCallback(() => {
    if (showInfoCards && dismissedCards.size > 0) {
      // If some cards are dismissed, restore them all
      restoreAllInfoCards()
    } else if (showInfoCards) {
      // All cards visible, hide them
      toggleInfoCards()
    } else {
      // Cards hidden, show and restore all
      restoreAllInfoCards()
      toggleInfoCards()
    }
  }, [showInfoCards, dismissedCards, toggleInfoCards])

  const { allNodes, allEdges } = useMemo(() => {
    const nodes: Node[] = Object.values(components).map((comp) => ({
      id: comp.id,
      type: 'component' as const,
      position: comp.position,
      data: comp,
      selected: comp.id === selectedNodeId,
    }))

    const edges: Edge[] = []

    // Add chain visualization nodes and edges
    if (chainViewMode === 'detailed') {
      Object.values(chains).forEach((chain) => {
        const source = components[chain.sourceId]
        const target = components[chain.targetId]
        if (!source || !target) return

        const midX = (source.position.x + target.position.x) / 2
        const midY = (source.position.y + target.position.y) / 2

        // Condition junction nodes
        if (chain.stages.potential) {
          const nodeId = `cond-${chain.id}-existence`
          nodes.push({
            id: nodeId,
            type: 'condition',
            position: { x: midX - 80, y: source.position.y + 100 },
            data: { label: 'Existence', formula: chain.stages.potential.expression, chainId: chain.id, stage: 'potential' },
            draggable: false,
            selectable: false,
          })
          edges.push({
            id: `edge-${chain.id}-src-exist`,
            source: chain.sourceId,
            target: nodeId,
            type: 'causal',
            data: { chainId: chain.id, chainStage: chainStages[chain.id], playbackState, isSimulating },
          })
        }

        if (chain.stages.potentiality) {
          const existNodeId = `cond-${chain.id}-existence`
          const suscNodeId = `cond-${chain.id}-susceptibility`
          nodes.push({
            id: suscNodeId,
            type: 'condition',
            position: { x: midX, y: midY },
            data: { label: 'Susceptibility', formula: chain.stages.potentiality.expression, chainId: chain.id, stage: 'potentiality' },
            draggable: false,
            selectable: false,
          })
          edges.push({
            id: `edge-${chain.id}-exist-susc`,
            source: existNodeId,
            target: suscNodeId,
            type: 'causal',
            data: { chainId: chain.id, chainStage: chainStages[chain.id], playbackState, isSimulating },
          })
        }

        if (chain.stages.actuality) {
          const suscNodeId = `cond-${chain.id}-susceptibility`
          const trigNodeId = `cond-${chain.id}-triggering`
          nodes.push({
            id: trigNodeId,
            type: 'condition',
            position: { x: midX + 80, y: target.position.y - 60 },
            data: { label: 'Triggering', formula: chain.stages.actuality.triggering.expression, chainId: chain.id, stage: 'actuality' },
            draggable: false,
            selectable: false,
          })
          edges.push({
            id: `edge-${chain.id}-susc-trig`,
            source: suscNodeId,
            target: trigNodeId,
            type: 'causal',
            data: { chainId: chain.id, chainStage: chainStages[chain.id], playbackState, isSimulating },
          })
          // Impact arrow from triggering to target
          edges.push({
            id: `edge-${chain.id}-trig-target`,
            source: trigNodeId,
            target: chain.targetId,
            type: 'impact',
            data: { chainId: chain.id, chainStage: chainStages[chain.id], playbackState, isSimulating },
          })
        }
      })
    } else {
      // Compact view: direct edges source → target with stage indicators
      Object.values(chains).forEach((chain) => {
        const source = components[chain.sourceId]
        const target = components[chain.targetId]
        if (!source || !target) return

        edges.push({
          id: `edge-${chain.id}-compact`,
          source: chain.sourceId,
          target: chain.targetId,
          type: 'causal',
          label: `❶→❷→❸ ${chain.name}`,
          data: { chainId: chain.id, compact: true, chainStage: chainStages[chain.id], playbackState, isSimulating },
        })
      })
    }

    // Add info card nodes (if visible and not dismissed)
    if (showInfoCards && infoCards.length > 0) {
      for (const card of infoCards) {
        if (dismissedCards.has(card.id)) continue
        nodes.push({
          id: `info-${card.id}`,
          type: 'infoCard',
          position: card.position,
          data: { text: card.text, infoCardId: card.id, onDismiss: handleDismissInfoCard },
          draggable: false,
          selectable: false,
          deletable: false,
        })
      }
    }

    return { allNodes: nodes, allEdges: edges }
  }, [components, chains, selectedNodeId, chainViewMode, chainStages, playbackState, isSimulating, showInfoCards, infoCards, dismissedCards, handleDismissInfoCard])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateComponentPosition(change.id, change.position)
        }
        if (change.type === 'remove') {
          // Don't allow removing info card nodes via keyboard
          if (change.id.startsWith('info-')) continue
          removeComponent(change.id)
          selectNode(null)
        }
      }
    },
    [updateComponentPosition, removeComponent, selectNode]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Don't select info card nodes
      if (node.type === 'infoCard') return
      selectNode(node.id)
    },
    [selectNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    closeContextMenu()
  }, [selectNode, closeContextMenu])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (activeMode !== 'editor') return
      // Only show context menu for component nodes (not condition or info card nodes)
      if (node.type !== 'component') return
      event.preventDefault()
      openContextMenu(node.id, { x: event.clientX, y: event.clientY })
    },
    [openContextMenu, activeMode]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/cascadesim-component-type') as ComponentType
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const id = addComponent(type, position)
      selectNode(id)
    },
    [screenToFlowPosition, addComponent, selectNode]
  )

  const connected = useCollaborationStore((s) => s.connected)

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!connected) return
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setCursorPosition(flowPosition)
    },
    [connected, screenToFlowPosition]
  )

  const onMouseLeave = useCallback(() => {
    if (!connected) return
    setCursorPosition(null)
  }, [connected])

  const hasInfoCards = infoCards.length > 0
  const hasComponents = Object.keys(components).length > 0
  const [relayoutOpen, setRelayoutOpen] = useState(false)

  const handleRelayout = useCallback(async (direction: LayoutDirection) => {
    setRelayoutOpen(false)
    const comps = Object.values(components)
    const chs = Object.values(chains)
    if (comps.length === 0) return

    const positions = await computeElkLayout(
      { components: comps, chains: chs },
      direction
    )

    useModelStore.setState((state) => {
      const updated = { ...state.components }
      for (const [id, pos] of Object.entries(positions)) {
        if (updated[id]) {
          updated[id] = { ...updated[id], position: pos }
        }
      }
      return { components: updated }
    })

    // fitView after layout
    if (reactFlowInstance.current) {
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.1, duration: 200 })
      }, 50)
    }
  }, [components, chains])

  return (
    <div onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className="w-full h-full relative">
      <ReactFlow
        nodes={allNodes}
        edges={allEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => { reactFlowInstance.current = instance }}
        fitView={false}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-[var(--color-background)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border)" />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ width: 150, height: 100 }}
        />
      </ReactFlow>
      <LiveCursors />
      {/* Chain view toggle button */}
      <button
        data-testid="chain-view-toggle"
        onClick={toggleChainViewMode}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
        title={chainViewMode === 'detailed' ? 'Switch to compact view' : 'Switch to detailed view'}
      >
        {chainViewMode === 'detailed' ? (
          <>
            <span>⊟</span>
            <span>Compact</span>
          </>
        ) : (
          <>
            <span>⊞</span>
            <span>Detailed</span>
          </>
        )}
      </button>
      {/* Info card toggle button (only visible when info cards exist) */}
      {hasInfoCards && (
        <button
          data-testid="toggle-info-cards"
          onClick={handleToggleInfoCards}
          className="absolute top-3 right-32 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          title={showInfoCards ? 'Hide info cards' : 'Show info cards'}
        >
          {showInfoCards ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>{showInfoCards ? 'Hide Info' : 'Show Info'}</span>
        </button>
      )}
      {/* Re-Layout button with dropdown (editor mode only) */}
      {hasComponents && activeMode === 'editor' && (
        <div className="absolute top-3 right-56 z-10 relative">
          <button
            data-testid="relayout-button"
            onClick={() => setRelayoutOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            title="Re-Layout nodes"
          >
            <LayoutGrid size={12} />
            <span>Re-Layout</span>
          </button>
          {relayoutOpen && (
            <div className="absolute top-full right-0 mt-1 py-1 rounded-md border shadow-lg min-w-[120px]" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <button
                data-testid="relayout-option-lr"
                onClick={() => handleRelayout('LR')}
                className="block w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--color-text)' }}
              >
                Left → Right
              </button>
              <button
                data-testid="relayout-option-tb"
                onClick={() => handleRelayout('TB')}
                className="block w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--color-text)' }}
              >
                Top → Bottom
              </button>
              <button
                data-testid="relayout-option-compact"
                onClick={() => handleRelayout('COMPACT')}
                className="block w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--color-text)' }}
              >
                Compact
              </button>
            </div>
          )}
        </div>
      )}
      <ContextMenu />
      <ChainBuilder />
    </div>
  )
}

export function Canvas() {
  return (
    <div className="w-full h-full">
      <CanvasInner />
    </div>
  )
}
