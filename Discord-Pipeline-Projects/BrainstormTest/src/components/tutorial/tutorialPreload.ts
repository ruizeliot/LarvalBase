import { useModelStore } from '@/store/modelStore'
import { useScenarioStore } from '@/store/scenarioStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUiStore } from '@/store/uiStore'

const IDS = {
  comp1: 'tut-factory',
  comp2: 'tut-transport',
  comp3: 'tut-warehouse',
  comp4: 'tut-retailer',
  param1: 'tut-p-output',
  param2: 'tut-p-capacity',
  param3: 'tut-p-stock',
  param4: 'tut-p-supply',
  chain1: 'tut-ch-fact-trans',
  chain2: 'tut-ch-fact-ware',
  chain3: 'tut-ch-trans-ret',
  scenario: 'tut-scenario',
  event1: 'tut-fe-1',
}

/**
 * Pre-load a complex model for Phase 3 tutorial (Reading Results).
 * Creates 4 components, 3 causal chains, and 1 scenario with a forced event.
 * Switches to simulate mode so results panel is visible.
 */
export function preloadPhase3Model() {
  const { components } = useModelStore.getState()
  if (Object.keys(components).length >= 3) return

  useModelStore.setState({
    components: {
      [IDS.comp1]: {
        id: IDS.comp1,
        name: 'Factory',
        type: 'internal',
        parameters: [{ id: IDS.param1, name: 'output', value: 100 }],
        capacities: [],
        position: { x: 100, y: 200 },
      },
      [IDS.comp2]: {
        id: IDS.comp2,
        name: 'Transport',
        type: 'internal',
        parameters: [{ id: IDS.param2, name: 'capacity', value: 50 }],
        capacities: [],
        position: { x: 400, y: 100 },
      },
      [IDS.comp3]: {
        id: IDS.comp3,
        name: 'Warehouse',
        type: 'internal',
        parameters: [{ id: IDS.param3, name: 'stock', value: 200 }],
        capacities: [],
        position: { x: 400, y: 300 },
      },
      [IDS.comp4]: {
        id: IDS.comp4,
        name: 'Retailer',
        type: 'internal',
        parameters: [{ id: IDS.param4, name: 'supply', value: 80 }],
        capacities: [],
        position: { x: 700, y: 200 },
      },
    },
    chains: {
      [IDS.chain1]: {
        id: IDS.chain1,
        name: 'Factory → Transport',
        chainType: 'inflicted',
        sourceId: IDS.comp1,
        targetId: IDS.comp2,
        stages: {
          potential: null,
          potentiality: null,
          actuality: {
            triggering: { id: 'tut-trig-1', expression: 'Factory_output > 80', type: 'triggering' },
            consequences: [{
              id: 'tut-cons-1',
              parameterId: IDS.param2,
              function: 'current * 0.5',
              durationType: 'impulse',
            }],
          },
        },
      },
      [IDS.chain2]: {
        id: IDS.chain2,
        name: 'Factory → Warehouse',
        chainType: 'inflicted',
        sourceId: IDS.comp1,
        targetId: IDS.comp3,
        stages: {
          potential: null,
          potentiality: null,
          actuality: {
            triggering: { id: 'tut-trig-2', expression: 'Factory_output > 80', type: 'triggering' },
            consequences: [{
              id: 'tut-cons-2',
              parameterId: IDS.param3,
              function: 'current - 30',
              durationType: 'impulse',
            }],
          },
        },
      },
      [IDS.chain3]: {
        id: IDS.chain3,
        name: 'Transport → Retailer',
        chainType: 'inflicted',
        sourceId: IDS.comp2,
        targetId: IDS.comp4,
        stages: {
          potential: null,
          potentiality: null,
          actuality: {
            triggering: { id: 'tut-trig-3', expression: 'Transport_capacity < 40', type: 'triggering' },
            consequences: [{
              id: 'tut-cons-3',
              parameterId: IDS.param4,
              function: 'current * 0.5',
              durationType: 'impulse',
            }],
          },
        },
      },
    },
    componentCounter: 4,
  })

  useScenarioStore.setState({
    scenarios: {
      [IDS.scenario]: {
        id: IDS.scenario,
        name: 'Supply Chain Disruption',
        forcedEvents: [{
          id: IDS.event1,
          componentId: IDS.comp1,
          parameterId: IDS.param1,
          value: 150,
          time: 0,
        }],
      },
    },
    activeScenarioId: IDS.scenario,
    scenarioCounter: 1,
  })

  useSimulationStore.getState().setSelectedScenario(IDS.scenario)
  useUiStore.getState().setActiveMode('simulate')
}

/**
 * Pre-load a simple model for Phase 4 tutorial (Collaboration).
 * Ensures at least 2 components exist on the canvas so user can select one
 * during step 5 (co-editing). Stays in editor mode.
 */
export function preloadPhase4Model() {
  const { components } = useModelStore.getState()
  if (Object.keys(components).length >= 2) return

  useModelStore.setState({
    components: {
      'tut4-server': {
        id: 'tut4-server',
        name: 'Server',
        type: 'internal',
        parameters: [{ id: 'tut4-p-load', name: 'load', value: 75 }],
        capacities: [],
        position: { x: 200, y: 200 },
      },
      'tut4-database': {
        id: 'tut4-database',
        name: 'Database',
        type: 'internal',
        parameters: [{ id: 'tut4-p-connections', name: 'connections', value: 50 }],
        capacities: [],
        position: { x: 500, y: 200 },
      },
    },
    chains: {},
    componentCounter: 2,
  })

  useUiStore.getState().setActiveMode('editor')
}
