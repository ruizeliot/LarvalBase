import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenarioList } from './ScenarioList'
import { useScenarioStore } from '@/store/scenarioStore'

function resetStore() {
  useScenarioStore.setState({
    scenarios: {},
    activeScenarioId: null,
    scenarioCounter: 0,
  })
}

describe('ScenarioList', () => {
  beforeEach(resetStore)

  it('renders empty state message when no scenarios', () => {
    render(<ScenarioList />)
    expect(screen.getByText(/No scenarios yet/)).toBeInTheDocument()
  })

  it('renders create button', () => {
    render(<ScenarioList />)
    expect(screen.getByTestId('create-scenario')).toBeInTheDocument()
  })

  it('creates a scenario on click', async () => {
    const user = userEvent.setup()
    render(<ScenarioList />)
    await user.click(screen.getByTestId('create-scenario'))
    expect(screen.getByText('Scenario 1')).toBeInTheDocument()
    expect(screen.queryByText(/No scenarios yet/)).not.toBeInTheDocument()
  })

  it('displays event count per scenario', async () => {
    const id = useScenarioStore.getState().createScenario()
    useScenarioStore.getState().addForcedEvent(id)
    useScenarioStore.getState().addForcedEvent(id)
    render(<ScenarioList />)
    expect(screen.getByText('2 events')).toBeInTheDocument()
  })

  it('displays singular "event" for 1 event', () => {
    const id = useScenarioStore.getState().createScenario()
    useScenarioStore.getState().addForcedEvent(id)
    render(<ScenarioList />)
    expect(screen.getByText('1 event')).toBeInTheDocument()
  })

  it('selects a scenario on click', async () => {
    const user = userEvent.setup()
    const id = useScenarioStore.getState().createScenario()
    useScenarioStore.getState().createScenario()
    useScenarioStore.getState().setActiveScenario(null)

    render(<ScenarioList />)
    await user.click(screen.getByText('Scenario 1'))
    expect(useScenarioStore.getState().activeScenarioId).toBe(id)
  })

  it('deletes a scenario via delete button with confirmation', async () => {
    const user = userEvent.setup()
    const id = useScenarioStore.getState().createScenario()
    render(<ScenarioList />)
    await user.click(screen.getByTestId(`delete-scenario-${id}`))
    // Confirmation dialog should appear
    expect(screen.getByTestId('scenario-delete-confirm')).toBeInTheDocument()
    // Click confirm to delete
    await user.click(screen.getByTestId('scenario-delete-ok'))
    expect(useScenarioStore.getState().scenarios[id]).toBeUndefined()
  })

  it('cancels scenario deletion', async () => {
    const user = userEvent.setup()
    const id = useScenarioStore.getState().createScenario()
    render(<ScenarioList />)
    await user.click(screen.getByTestId(`delete-scenario-${id}`))
    expect(screen.getByTestId('scenario-delete-confirm')).toBeInTheDocument()
    await user.click(screen.getByTestId('scenario-delete-cancel'))
    expect(useScenarioStore.getState().scenarios[id]).toBeDefined()
    expect(screen.queryByTestId('scenario-delete-confirm')).not.toBeInTheDocument()
  })

  it('duplicates a scenario via duplicate button', async () => {
    const user = userEvent.setup()
    const id = useScenarioStore.getState().createScenario()
    render(<ScenarioList />)
    await user.click(screen.getByTestId(`duplicate-scenario-${id}`))
    const scenarios = Object.values(useScenarioStore.getState().scenarios)
    expect(scenarios).toHaveLength(2)
    expect(scenarios.find((s) => s.name === 'Scenario 1 (copy)')).toBeDefined()
  })

  it('renders multiple scenarios', () => {
    useScenarioStore.getState().createScenario()
    useScenarioStore.getState().createScenario()
    useScenarioStore.getState().createScenario()
    render(<ScenarioList />)
    expect(screen.getByText('Scenario 1')).toBeInTheDocument()
    expect(screen.getByText('Scenario 2')).toBeInTheDocument()
    expect(screen.getByText('Scenario 3')).toBeInTheDocument()
  })
})
