import { describe, it, expect } from 'vitest'
import { buildContext, propagateCascades } from './cascader'
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

describe('buildContext', () => {
  it('builds flat context from components and parameter values', () => {
    const comp = makeComponent('c1', 'Reactor', [
      { id: 'p1', name: 'temp', value: 100 },
      { id: 'p2', name: 'pressure', value: 50 },
    ])
    const ctx = buildContext({ c1: comp }, { c1: { p1: 100, p2: 50 } })
    expect(ctx).toEqual({ Reactor_temp: 100, Reactor_pressure: 50 })
  })

  it('replaces spaces in names with underscores', () => {
    const comp = makeComponent('c1', 'Reactor Core', [
      { id: 'p1', name: 'max temp', value: 200 },
    ])
    const ctx = buildContext({ c1: comp }, { c1: { p1: 200 } })
    expect(ctx).toEqual({ Reactor_Core_max_temp: 200 })
  })

  it('falls back to default param value when not in parameterValues', () => {
    const comp = makeComponent('c1', 'R', [{ id: 'p1', name: 'x', value: 42 }])
    const ctx = buildContext({ c1: comp }, {})
    expect(ctx.R_x).toBe(42)
  })
})

describe('propagateCascades', () => {
  it('returns empty events when no chains', () => {
    const comp = makeComponent('c1', 'R', [{ id: 'p1', name: 'x', value: 0 }])
    const { events } = propagateCascades({ c1: comp }, {}, { c1: { p1: 0 } }, 0)
    expect(events).toEqual([])
  })

  it('fires cascade when conditions are met', () => {
    const source = makeComponent('c1', 'Source', [{ id: 'p1', name: 'val', value: 100 }])
    const target = makeComponent('c2', 'Target', [{ id: 'p2', name: 'recv', value: 0 }])
    const chain: CausalChain = {
      id: 'ch1',
      name: 'test',
      chainType: 'cause',
      sourceId: 'c1',
      targetId: 'c2',
      stages: {
        potential: { id: 'cond1', expression: 'Source_val > 50', type: 'existence' },
        potentiality: null,
        actuality: {
          triggering: { id: 'trig1', expression: 'Source_val > 50', type: 'triggering' },
          consequences: [{ id: 'cons1', parameterId: 'p2', function: '42', durationType: 'persistent' }],
        },
      },
    }
    const { events, updatedValues } = propagateCascades(
      { c1: source, c2: target },
      { ch1: chain },
      { c1: { p1: 100 }, c2: { p2: 0 } },
      5
    )
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('cascade')
    expect(events[0].newValue).toBe(42)
    expect(events[0].time).toBe(5)
    expect(updatedValues.c2.p2).toBe(42)
  })

  it('does not fire cascade when potential condition fails', () => {
    const source = makeComponent('c1', 'Source', [{ id: 'p1', name: 'val', value: 10 }])
    const target = makeComponent('c2', 'Target', [{ id: 'p2', name: 'recv', value: 0 }])
    const chain: CausalChain = {
      id: 'ch1',
      name: 'test',
      chainType: 'cause',
      sourceId: 'c1',
      targetId: 'c2',
      stages: {
        potential: { id: 'cond1', expression: 'Source_val > 50', type: 'existence' },
        potentiality: null,
        actuality: {
          triggering: { id: 'trig1', expression: 'Source_val > 50', type: 'triggering' },
          consequences: [{ id: 'cons1', parameterId: 'p2', function: '42', durationType: 'persistent' }],
        },
      },
    }
    const { events } = propagateCascades(
      { c1: source, c2: target },
      { ch1: chain },
      { c1: { p1: 10 }, c2: { p2: 0 } },
      0
    )
    expect(events).toEqual([])
  })

  it('skips chain with missing source or target', () => {
    const comp = makeComponent('c1', 'X', [{ id: 'p1', name: 'x', value: 0 }])
    const chain: CausalChain = {
      id: 'ch1',
      name: 'orphan',
      chainType: 'cause',
      sourceId: 'c1',
      targetId: 'missing',
      stages: { potential: null, potentiality: null, actuality: null },
    }
    const { events } = propagateCascades(
      { c1: comp },
      { ch1: chain },
      { c1: { p1: 0 } },
      0
    )
    expect(events).toEqual([])
  })

  it('does not produce event when new value equals old value', () => {
    const source = makeComponent('c1', 'S', [{ id: 'p1', name: 'v', value: 10 }])
    const target = makeComponent('c2', 'T', [{ id: 'p2', name: 'w', value: 42 }])
    const chain: CausalChain = {
      id: 'ch1',
      name: 'noop',
      chainType: 'cause',
      sourceId: 'c1',
      targetId: 'c2',
      stages: {
        potential: null,
        potentiality: null,
        actuality: {
          triggering: { id: 'trig1', expression: '1 > 0', type: 'triggering' },
          consequences: [{ id: 'cons1', parameterId: 'p2', function: '42', durationType: 'persistent' }],
        },
      },
    }
    const { events } = propagateCascades(
      { c1: source, c2: target },
      { ch1: chain },
      { c1: { p1: 10 }, c2: { p2: 42 } },
      0
    )
    expect(events).toEqual([])
  })
})
