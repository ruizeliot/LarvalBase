import { useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type OnNodesChange,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useModelStore } from '@/store/modelStore'
import { useUiStore } from '@/store/uiStore'
import { ComponentNode } from './nodes/ComponentNode'
import type { ComponentType } from '@/types/model'

const nodeTypes: NodeTypes = {
  component: ComponentNode,
}

function CanvasInner() {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const components = useModelStore((s) => s.components)
  const addComponent = useModelStore((s) => s.addComponent)
  const updateComponentPosition = useModelStore((s) => s.updateComponentPosition)
  const selectNode = useUiStore((s) => s.selectNode)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)

  const selectedNodes = useMemo(() => {
    const nodes: Node[] = Object.values(components).map((comp) => ({
      id: comp.id,
      type: 'component' as const,
      position: comp.position,
      data: comp,
      selected: comp.id === selectedNodeId,
    }))
    return nodes
  }, [components, selectedNodeId])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateComponentPosition(change.id, change.position)
        }
      }
    },
    [updateComponentPosition]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

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
    <ReactFlow
      nodes={selectedNodes}
      edges={[]}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
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
  )
}

export function Canvas() {
  return (
    <div className="w-full h-full">
      <CanvasInner />
    </div>
  )
}
