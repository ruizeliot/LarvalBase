import { useCallback, useMemo, useRef } from 'react'
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
import { ComponentNode } from './nodes/ComponentNode'
import { ConditionNode } from './nodes/ConditionNode'
import { ContextMenu } from './ContextMenu'
import { ChainBuilder } from '@/components/chain-builder/ChainBuilder'
import { CausalEdge } from './edges/CausalEdge'
import { ImpactEdge } from './edges/ImpactEdge'
import type { ComponentType } from '@/types/model'

const nodeTypes: NodeTypes = {
  component: ComponentNode,
  condition: ConditionNode,
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
            data: { chainId: chain.id },
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
            data: { chainId: chain.id },
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
            data: { chainId: chain.id },
          })
          // Impact arrow from triggering to target
          edges.push({
            id: `edge-${chain.id}-trig-target`,
            source: trigNodeId,
            target: chain.targetId,
            type: 'impact',
            data: { chainId: chain.id },
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
          data: { chainId: chain.id, compact: true },
        })
      })
    }

    return { allNodes: nodes, allEdges: edges }
  }, [components, chains, selectedNodeId, chainViewMode])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateComponentPosition(change.id, change.position)
        }
        if (change.type === 'remove') {
          removeComponent(change.id)
          selectNode(null)
        }
      }
    },
    [updateComponentPosition, removeComponent, selectNode]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
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
      // Only show context menu for component nodes (not condition nodes)
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

  return (
    <>
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
      <ContextMenu />
      <ChainBuilder />
    </>
  )
}

export function Canvas() {
  return (
    <div className="w-full h-full">
      <CanvasInner />
    </div>
  )
}
