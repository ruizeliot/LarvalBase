import type { Component, CausalChain } from '@/types/model'
import { evaluate } from './evaluator'
import { buildContext, normalizeExpression } from './cascader'

export type ChainStageStatus = 'none' | 'potential' | 'potentiality' | 'actuality'

/**
 * Evaluate the active stage for each chain given a parameter snapshot.
 * Checks conditions in order: existence → susceptibility → triggering.
 */
export function evaluateChainStages(
  components: Record<string, Component>,
  chains: Record<string, CausalChain>,
  snapshot: Record<string, Record<string, number>>
): Record<string, ChainStageStatus> {
  const result: Record<string, ChainStageStatus> = {}
  const context = buildContext(components, snapshot)

  for (const chain of Object.values(chains)) {
    const source = components[chain.sourceId]
    const target = components[chain.targetId]
    if (!source || !target) {
      result[chain.id] = 'none'
      continue
    }

    // Check potential (existence condition)
    if (!chain.stages.potential) {
      result[chain.id] = 'none'
      continue
    }
    if (!evaluate(normalizeExpression(chain.stages.potential.expression, context), context)) {
      result[chain.id] = 'none'
      continue
    }

    // Check potentiality (susceptibility condition)
    if (!chain.stages.potentiality) {
      result[chain.id] = 'potential'
      continue
    }
    if (!evaluate(normalizeExpression(chain.stages.potentiality.expression, context), context)) {
      result[chain.id] = 'potential'
      continue
    }

    // Check actuality (triggering condition)
    if (!chain.stages.actuality?.triggering) {
      result[chain.id] = 'potentiality'
      continue
    }
    if (!evaluate(normalizeExpression(chain.stages.actuality.triggering.expression, context), context)) {
      result[chain.id] = 'potentiality'
      continue
    }

    result[chain.id] = 'actuality'
  }

  return result
}
