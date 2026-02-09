import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { ComponentNode } from './ComponentNode'
import type { Component } from '@/types/model'

function renderNode(comp: Component, selected = false) {
  // ComponentNode expects NodeProps but we can approximate for testing
  const props = {
    id: comp.id,
    data: comp as never,
    selected,
    type: 'component',
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
  } as never

  return render(
    <ReactFlowProvider>
      <ComponentNode {...props} />
    </ReactFlowProvider>
  )
}

describe('ComponentNode', () => {
  const baseComponent: Component = {
    id: 'test-1',
    name: 'Reactor Core',
    type: 'internal',
    parameters: [
      { id: 'p1', name: 'temperature', value: 350 },
      { id: 'p2', name: 'pressure', value: 120 },
    ],
    capacities: [{ id: 'c1', name: 'load', min: 0, max: 1000 }],
    position: { x: 0, y: 0 },
  }

  it('renders the component name', () => {
    renderNode(baseComponent)
    expect(screen.getByText('Reactor Core')).toBeInTheDocument()
  })

  it('renders type badge for internal component', () => {
    renderNode(baseComponent)
    expect(screen.getByText('internal')).toBeInTheDocument()
  })

  it('renders parameters with values', () => {
    renderNode(baseComponent)
    expect(screen.getByText('temperature')).toBeInTheDocument()
    expect(screen.getByText('350')).toBeInTheDocument()
    expect(screen.getByText('pressure')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
  })

  it('renders capacities for internal components', () => {
    renderNode(baseComponent)
    expect(screen.getByText('load')).toBeInTheDocument()
    expect(screen.getByText('[0, 1000]')).toBeInTheDocument()
  })

  it('constrains node width with max-w class', () => {
    const longName: Component = {
      ...baseComponent,
      name: 'A Very Long Component Name That Should Be Truncated On The Canvas',
    }
    const { container } = renderNode(longName)
    const nodeDiv = container.querySelector('.rounded-lg')!
    expect(nodeDiv.className).toMatch(/max-w-/)
  })

  it('truncates long parameter names', () => {
    const longParams: Component = {
      ...baseComponent,
      parameters: [
        { id: 'p1', name: 'a_very_long_parameter_name_here', value: 42 },
      ],
    }
    renderNode(longParams)
    const paramName = screen.getByText('a_very_long_parameter_name_here')
    expect(paramName.className).toMatch(/truncate/)
  })

  it('does not render capacities for external components', () => {
    const external: Component = {
      ...baseComponent,
      type: 'external',
      capacities: [],
    }
    renderNode(external)
    expect(screen.getByText('external')).toBeInTheDocument()
    expect(screen.queryByText('Capacities')).not.toBeInTheDocument()
  })
})
