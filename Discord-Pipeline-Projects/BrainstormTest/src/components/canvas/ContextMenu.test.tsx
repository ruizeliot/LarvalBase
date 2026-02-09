import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu } from './ContextMenu'
import { useModelStore } from '@/store/modelStore'
import { useUiStore } from '@/store/uiStore'

describe('ContextMenu', () => {
  let componentId: string

  beforeEach(() => {
    useModelStore.setState({ components: {}, chains: {}, componentCounter: 0 })
    useUiStore.setState({
      contextMenuNodeId: null,
      contextMenuPosition: null,
      chainBuilderOpen: false,
      chainBuilderSourceId: null,
    })
    componentId = useModelStore.getState().addComponent('internal', { x: 0, y: 0 })
  })

  it('does not render when no context menu is open', () => {
    const { container } = render(<ContextMenu />)
    expect(container.innerHTML).toBe('')
  })

  it('deletes component when Delete is clicked', async () => {
    const user = userEvent.setup()
    useUiStore.setState({
      contextMenuNodeId: componentId,
      contextMenuPosition: { x: 100, y: 100 },
    })

    render(<ContextMenu />)
    const deleteBtn = screen.getByTestId('context-menu-delete')
    await user.click(deleteBtn)

    // Component should be removed from store
    expect(useModelStore.getState().components[componentId]).toBeUndefined()
    // Context menu should be closed
    expect(useUiStore.getState().contextMenuNodeId).toBeNull()
  })

  it('deletes component and its associated chains', async () => {
    const user = userEvent.setup()
    const targetId = useModelStore.getState().addComponent('internal', { x: 200, y: 0 })
    useModelStore.getState().addChain({
      name: 'Test Chain',
      chainType: 'inflicted',
      sourceId: componentId,
      targetId,
      stages: {
        potential: { id: 'p1', expression: 'x > 1', type: 'existence' },
        potentiality: { id: 'p2', expression: 'y > 1', type: 'susceptibility' },
        actuality: { triggering: { id: 't1', expression: 'z > 1', type: 'triggering' }, consequences: [] },
      },
    })

    useUiStore.setState({
      contextMenuNodeId: componentId,
      contextMenuPosition: { x: 100, y: 100 },
    })

    render(<ContextMenu />)
    await user.click(screen.getByTestId('context-menu-delete'))

    expect(useModelStore.getState().components[componentId]).toBeUndefined()
    expect(Object.keys(useModelStore.getState().chains)).toHaveLength(0)
  })
})
