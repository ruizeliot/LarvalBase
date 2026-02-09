import { describe, it, expect } from 'vitest'
import { runSimulation, type SimulatorInput } from './simulator'
import type { Component, CausalChain } from '@/types/model'

function makeComponent(id: string, name: string, params: Array<{ id: string; name: string; value: number }>): Component {
  return {
    id,
    name,
    type: 'internal',
    parameters: params.map((p) => ({ ...p })),
    capacities: [],
    position: { x: 0, y: 0 },
  }
}

describe('runSimulation', () => {
  it('runs with no forced events and no chains', () => {
    const comp = makeComponent('c1', 'Reactor', [{ id: 'p1', name: 'temp', value: 100 }])
    const result = runSimulation({
      components: { c1: comp },
      chains: {},
      forcedEvents: [],
      timeStep: 1,
      maxIterations: 5,
    })
    expect(result.totalSteps).toBe(5)
    expect(result.componentsAffected).toBe(0)
    expect(result.finalState.c1.p1).toBe(100)
  })

  it('applies forced events at the correct time', () => {
    const comp = makeComponent('c1', 'Reactor', [{ id: 'p1', name: 'temp', value: 100 }])
    const result = runSimulation({
      components: { c1: comp },
      chains: {},
      forcedEvents: [
        { id: 'fe1', componentId: 'c1', parameterId: 'p1', value: 999, time: 2 },
      ],
      timeStep: 1,
      maxIterations: 5,
    })

    // At t=0 and t=1, temp should still be 100
    expect(result.timesteps[0].snapshot.c1.p1).toBe(100)
    expect(result.timesteps[1].snapshot.c1.p1).toBe(100)
    // At t=2, forced event applies
    expect(result.timesteps[2].snapshot.c1.p1).toBe(999)
    expect(result.timesteps[2].events).toHaveLength(1)
    expect(result.timesteps[2].events[0].type).toBe('forced')
    expect(result.timesteps[2].events[0].oldValue).toBe(100)
    expect(result.timesteps[2].events[0].newValue).toBe(999)
    // Final state should reflect the forced event
    expect(result.finalState.c1.p1).toBe(999)
    expect(result.componentsAffected).toBe(1)
  })

  it('applies multiple forced events at the same time', () => {
    const comp = makeComponent('c1', 'Reactor', [
      { id: 'p1', name: 'temp', value: 0 },
      { id: 'p2', name: 'pressure', value: 0 },
    ])
    const result = runSimulation({
      components: { c1: comp },
      chains: {},
      forcedEvents: [
        { id: 'fe1', componentId: 'c1', parameterId: 'p1', value: 100, time: 0 },
        { id: 'fe2', componentId: 'c1', parameterId: 'p2', value: 50, time: 0 },
      ],
      timeStep: 1,
      maxIterations: 3,
    })

    expect(result.timesteps[0].events).toHaveLength(2)
    expect(result.finalState.c1.p1).toBe(100)
    expect(result.finalState.c1.p2).toBe(50)
  })

  it('skips forced events with empty componentId or parameterId', () => {
    const comp = makeComponent('c1', 'Reactor', [{ id: 'p1', name: 'temp', value: 100 }])
    const result = runSimulation({
      components: { c1: comp },
      chains: {},
      forcedEvents: [
        { id: 'fe1', componentId: '', parameterId: 'p1', value: 999, time: 0 },
        { id: 'fe2', componentId: 'c1', parameterId: '', value: 999, time: 0 },
      ],
      timeStep: 1,
      maxIterations: 3,
    })
    expect(result.timesteps[0].events).toHaveLength(0)
    expect(result.finalState.c1.p1).toBe(100)
  })

  it('propagates cascades through causal chains', () => {
    const source = makeComponent('c1', 'Source', [{ id: 'p1', name: 'output', value: 0 }])
    const target = makeComponent('c2', 'Target', [{ id: 'p2', name: 'input', value: 0 }])
    const chain: CausalChain = {
      id: 'ch1',
      name: 'Source to Target',
      chainType: 'cause',
      sourceId: 'c1',
      targetId: 'c2',
      stages: {
        potential: { id: 'cond1', expression: 'Source_output > 50', type: 'existence' },
        potentiality: null,
        actuality: {
          triggering: { id: 'trig1', expression: 'Source_output > 50', type: 'triggering' },
          consequences: [{ id: 'cons1', parameterId: 'p2', function: 'Source_output * 2', durationType: 'persistent' }],
        },
      },
    }
    const result = runSimulation({
      components: { c1: source, c2: target },
      chains: { ch1: chain },
      forcedEvents: [
        { id: 'fe1', componentId: 'c1', parameterId: 'p1', value: 100, time: 0 },
      ],
      timeStep: 1,
      maxIterations: 5,
    })

    // t=0: forced event sets Source.output=100, then cascade fires (100>50), Target.input = 100*2 = 200
    expect(result.timesteps[0].events.length).toBeGreaterThanOrEqual(2)
    const forcedEvent = result.timesteps[0].events.find((e) => e.type === 'forced')
    expect(forcedEvent).toBeDefined()
    // The cascade should fire because the forced event already set the value
    // However, cascader reads from parameterValues which is updated after forced events
    expect(result.finalState.c2.p2).toBe(200)
    expect(result.componentsAffected).toBe(2)
  })

  it('respects condition that prevents cascade', () => {
    const source = makeComponent('c1', 'Source', [{ id: 'p1', name: 'output', value: 0 }])
    const target = makeComponent('c2', 'Target', [{ id: 'p2', name: 'input', value: 0 }])
    const chain: CausalChain = {
      id: 'ch1',
      name: 'Source to Target',
      chainType: 'cause',
      sourceId: 'c1',
      targetId: 'c2',
      stages: {
        potential: { id: 'cond1', expression: 'Source_output > 50', type: 'existence' },
        potentiality: null,
        actuality: {
          triggering: { id: 'trig1', expression: 'Source_output > 50', type: 'triggering' },
          consequences: [{ id: 'cons1', parameterId: 'p2', function: '999', durationType: 'persistent' }],
        },
      },
    }
    const result = runSimulation({
      components: { c1: source, c2: target },
      chains: { ch1: chain },
      forcedEvents: [
        { id: 'fe1', componentId: 'c1', parameterId: 'p1', value: 30, time: 0 },
      ],
      timeStep: 1,
      maxIterations: 3,
    })

    // Source.output=30 which is NOT > 50, so cascade should NOT fire
    expect(result.finalState.c2.p2).toBe(0)
    expect(result.componentsAffected).toBe(1) // only source affected by forced event
  })

  it('records correct componentName and parameterName in events', () => {
    const comp = makeComponent('c1', 'Reactor Core', [{ id: 'p1', name: 'temperature', value: 0 }])
    const result = runSimulation({
      components: { c1: comp },
      chains: {},
      forcedEvents: [
        { id: 'fe1', componentId: 'c1', parameterId: 'p1', value: 500, time: 0 },
      ],
      timeStep: 1,
      maxIterations: 2,
    })
    expect(result.timesteps[0].events[0].componentName).toBe('Reactor Core')
    expect(result.timesteps[0].events[0].parameterName).toBe('temperature')
  })

  it('handles timeStep > 1', () => {
    const comp = makeComponent('c1', 'R', [{ id: 'p1', name: 'x', value: 0 }])
    const result = runSimulation({
      components: { c1: comp },
      chains: {},
      forcedEvents: [
        { id: 'fe1', componentId: 'c1', parameterId: 'p1', value: 10, time: 5 },
      ],
      timeStep: 5,
      maxIterations: 4,
    })
    // t=0, t=5, t=10, t=15
    expect(result.timesteps[0].time).toBe(0)
    expect(result.timesteps[1].time).toBe(5)
    expect(result.timesteps[1].events).toHaveLength(1)
    expect(result.finalState.c1.p1).toBe(10)
  })
})
