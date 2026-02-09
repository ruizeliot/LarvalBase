import type { Component, CausalChain } from '@/types/model'
import type { SimulationEvent } from '@/types/simulation'
import { evaluate, evaluateConsequence } from './evaluator'

/**
 * Build a flat context of all parameter values across all components.
 * Keys are formatted as `componentName_parameterName` (spaces replaced with underscores).
 */
export function buildContext(
  components: Record<string, Component>,
  parameterValues: Record<string, Record<string, number>>
): Record<string, number> {
  const ctx: Record<string, number> = {}
  for (const comp of Object.values(components)) {
    for (const param of comp.parameters) {
      const key = `${comp.name.replace(/\s+/g, '_')}_${param.name.replace(/\s+/g, '_')}`
      ctx[key] = parameterValues[comp.id]?.[param.id] ?? param.value
    }
  }
  return ctx
}

/**
 * Normalize dot-notation references (Component.parameter) to underscore notation
 * (Component_parameter) so they match the context keys used by the evaluator.
 */
export function normalizeExpression(expression: string, context: Record<string, number>): string {
  return expression.replace(/([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g, (match, comp, param) => {
    const key = `${comp}_${param}`
    if (key in context) return key
    return match
  })
}

/**
 * Propagate cascades through all causal chains for a single timestep.
 * Checks each chain's conditions against current state and applies consequences.
 * Returns the list of cascade events and updated parameter values.
 *
 * @param firedImpulses - Set tracking impulse consequences that already fired (chainId-consequenceId).
 *                        Impulse consequences fire only once per simulation run.
 */
export function propagateCascades(
  components: Record<string, Component>,
  chains: Record<string, CausalChain>,
  parameterValues: Record<string, Record<string, number>>,
  time: number,
  firedImpulses: Set<string> = new Set()
): { events: SimulationEvent[]; updatedValues: Record<string, Record<string, number>> } {
  const events: SimulationEvent[] = []
  // Deep clone parameter values so mutations don't cross-contaminate
  const updated: Record<string, Record<string, number>> = {}
  for (const [cId, params] of Object.entries(parameterValues)) {
    updated[cId] = { ...params }
  }

  const context = buildContext(components, updated)

  for (const chain of Object.values(chains)) {
    const source = components[chain.sourceId]
    const target = components[chain.targetId]
    if (!source || !target) continue

    // Check potential condition (existence)
    if (chain.stages.potential) {
      if (!evaluate(normalizeExpression(chain.stages.potential.expression, context), context)) continue
    }

    // Check potentiality condition (susceptibility)
    if (chain.stages.potentiality) {
      if (!evaluate(normalizeExpression(chain.stages.potentiality.expression, context), context)) continue
    }

    // Apply actuality: check triggering condition, then apply consequences
    if (chain.stages.actuality) {
      const { triggering, consequences } = chain.stages.actuality

      // Check triggering condition
      if (triggering) {
        if (!evaluate(normalizeExpression(triggering.expression, context), context)) continue
      }

      // Apply each consequence
      for (const consequence of consequences) {
        // Skip impulse consequences that already fired
        const impulseKey = `${chain.id}-${consequence.id}`
        if (consequence.durationType === 'impulse' && firedImpulses.has(impulseKey)) continue

        const targetParam = target.parameters.find((p) => p.id === consequence.parameterId)
        if (!targetParam) continue

        const oldValue = updated[target.id]?.[targetParam.id] ?? targetParam.value
        const consequenceCtx = { ...context, current: oldValue }
        const newValue = evaluateConsequence(normalizeExpression(consequence.function, consequenceCtx), consequenceCtx)

        if (newValue !== oldValue) {
          if (!updated[target.id]) updated[target.id] = {}
          updated[target.id][targetParam.id] = newValue

          events.push({
            time,
            type: 'cascade',
            chainId: chain.id,
            sourceId: chain.sourceId,
            targetId: chain.targetId,
            parameterId: targetParam.id,
            oldValue,
            newValue,
            componentName: target.name,
            parameterName: targetParam.name,
          })

          // Mark impulse as fired
          if (consequence.durationType === 'impulse') {
            firedImpulses.add(impulseKey)
          }
        }
      }
    }
  }

  return { events, updatedValues: updated }
}
