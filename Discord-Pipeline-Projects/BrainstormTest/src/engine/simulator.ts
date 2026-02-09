import type { Component, CausalChain } from '@/types/model'
import type { ForcedEvent } from '@/types/scenario'
import type { SimulationEvent, SimulationResult, TimestepResult } from '@/types/simulation'
import { propagateCascades } from './cascader'

export interface SimulatorInput {
  components: Record<string, Component>
  chains: Record<string, CausalChain>
  forcedEvents: ForcedEvent[]
  timeStep: number
  maxIterations: number
}

/**
 * Snapshot current parameter values for all components.
 */
function takeSnapshot(
  components: Record<string, Component>,
  parameterValues: Record<string, Record<string, number>>
): Record<string, Record<string, number>> {
  const snap: Record<string, Record<string, number>> = {}
  for (const comp of Object.values(components)) {
    snap[comp.id] = {}
    for (const param of comp.parameters) {
      snap[comp.id][param.id] = parameterValues[comp.id]?.[param.id] ?? param.value
    }
  }
  return snap
}

/**
 * Initialize parameter values from model defaults.
 */
function initializeValues(
  components: Record<string, Component>
): Record<string, Record<string, number>> {
  const values: Record<string, Record<string, number>> = {}
  for (const comp of Object.values(components)) {
    values[comp.id] = {}
    for (const param of comp.parameters) {
      values[comp.id][param.id] = param.value
    }
  }
  return values
}

/**
 * Run a time-stepping simulation.
 *
 * For each timestep:
 * 1. Apply any forced events scheduled at this time
 * 2. Propagate cascades through causal chains
 * 3. Record the timestep result
 *
 * Stops when maxIterations is reached or when a full cycle produces no events
 * (after all forced events have been applied).
 */
export function runSimulation(input: SimulatorInput): SimulationResult {
  const { components, chains, forcedEvents, timeStep, maxIterations } = input

  let parameterValues = initializeValues(components)
  const timesteps: TimestepResult[] = []
  const affectedComponents = new Set<string>()
  const firedImpulses = new Set<string>()

  // Determine time range from forced events
  const maxForcedTime = forcedEvents.length > 0
    ? Math.max(...forcedEvents.map((e) => e.time))
    : 0
  const totalTime = Math.max(maxForcedTime + timeStep, maxIterations * timeStep)

  for (let i = 0; i < maxIterations; i++) {
    const time = i * timeStep
    const stepEvents: SimulationEvent[] = []

    // 1. Apply forced events at this time
    for (const fe of forcedEvents) {
      if (fe.time === time && fe.componentId && fe.parameterId) {
        const comp = components[fe.componentId]
        if (!comp) continue
        const param = comp.parameters.find((p) => p.id === fe.parameterId)
        if (!param) continue

        const oldValue = parameterValues[fe.componentId]?.[fe.parameterId] ?? param.value
        if (!parameterValues[fe.componentId]) parameterValues[fe.componentId] = {}
        parameterValues[fe.componentId][fe.parameterId] = fe.value

        stepEvents.push({
          time,
          type: 'forced',
          chainId: '',
          sourceId: fe.componentId,
          targetId: fe.componentId,
          parameterId: fe.parameterId,
          oldValue,
          newValue: fe.value,
          componentName: comp.name,
          parameterName: param.name,
        })
        affectedComponents.add(fe.componentId)
      }
    }

    // 2. Propagate cascades
    const { events: cascadeEvents, updatedValues } = propagateCascades(
      components,
      chains,
      parameterValues,
      time,
      firedImpulses
    )
    parameterValues = updatedValues
    stepEvents.push(...cascadeEvents)
    for (const e of cascadeEvents) {
      affectedComponents.add(e.targetId)
    }

    // 3. Record timestep
    const snapshot = takeSnapshot(components, parameterValues)
    timesteps.push({ time, events: stepEvents, snapshot })

    // Stop early if past all forced events and no cascades happened
    if (time > totalTime && stepEvents.length === 0) break
  }

  return {
    timesteps,
    totalSteps: timesteps.length,
    componentsAffected: affectedComponents.size,
    finalState: takeSnapshot(components, parameterValues),
  }
}
