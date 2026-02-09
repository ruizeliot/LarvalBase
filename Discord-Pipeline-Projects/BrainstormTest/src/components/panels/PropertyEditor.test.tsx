import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyEditor } from './PropertyEditor'
import { useModelStore } from '@/store/modelStore'

describe('PropertyEditor', () => {
  let componentId: string

  beforeEach(() => {
    useModelStore.setState({ components: {}, chains: {}, componentCounter: 0 })
    componentId = useModelStore.getState().addComponent('internal', { x: 0, y: 0 })
  })

  it('renders nothing when component does not exist', () => {
    const { container } = render(<PropertyEditor componentId="nonexistent" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders component name input', () => {
    render(<PropertyEditor componentId={componentId} />)
    const input = screen.getByTestId('property-name')
    expect(input).toHaveValue('Component 1')
  })

  it('updates component name on input change', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    const input = screen.getByTestId('property-name')
    await user.clear(input)
    await user.type(input, 'Reactor')
    expect(useModelStore.getState().components[componentId].name).toBe('Reactor')
  })

  it('shows type toggle buttons', () => {
    render(<PropertyEditor componentId={componentId} />)
    expect(screen.getByTestId('type-internal')).toBeInTheDocument()
    expect(screen.getByTestId('type-external')).toBeInTheDocument()
  })

  it('toggles type to external', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    await user.click(screen.getByTestId('type-external'))
    expect(useModelStore.getState().components[componentId].type).toBe('external')
  })

  it('adds a parameter', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    await user.click(screen.getByTestId('add-parameter'))
    expect(useModelStore.getState().components[componentId].parameters.length).toBe(1)
  })

  it('shows error for parameter names with spaces', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    await user.click(screen.getByTestId('add-parameter'))
    const paramInput = screen.getByPlaceholderText('name')
    await user.clear(paramInput)
    await user.type(paramInput, 'my param')
    expect(screen.getByTestId('param-error')).toHaveTextContent(/invalid/i)
  })

  it('shows error for parameter names with operators', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    await user.click(screen.getByTestId('add-parameter'))
    const paramInput = screen.getByPlaceholderText('name')
    await user.clear(paramInput)
    await user.type(paramInput, 'val+1')
    expect(screen.getByTestId('param-error')).toHaveTextContent(/invalid/i)
  })

  it('shows error for parameter names with brackets', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    await user.click(screen.getByTestId('add-parameter'))
    const paramInput = screen.getByPlaceholderText('name')
    await user.clear(paramInput)
    await user.type(paramInput, 'val(0)')
    expect(screen.getByTestId('param-error')).toHaveTextContent(/invalid/i)
  })

  it('shows capacity section only for internal components', async () => {
    const user = userEvent.setup()
    render(<PropertyEditor componentId={componentId} />)
    // Should show add-capacity for internal
    expect(screen.getByTestId('add-capacity')).toBeInTheDocument()

    // Switch to external
    await user.click(screen.getByTestId('type-external'))
    // Re-render needed since PropertyEditor reads store
    const { rerender } = render(<PropertyEditor componentId={componentId} />)
    rerender(<PropertyEditor componentId={componentId} />)
    expect(screen.queryByTestId('add-capacity')).not.toBeInTheDocument()
  })
})
