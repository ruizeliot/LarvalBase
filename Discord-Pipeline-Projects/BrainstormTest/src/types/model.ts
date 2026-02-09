export type ComponentType = 'internal' | 'external'

export interface Parameter {
  id: string
  name: string
  value: number
}

export interface Capacity {
  id: string
  name: string
  min: number
  max: number
}

export interface Component {
  id: string
  name: string
  type: ComponentType
  parameters: Parameter[]
  capacities: Capacity[]
  position: { x: number; y: number }
}

export type ConditionType = 'existence' | 'susceptibility' | 'triggering'

export interface Condition {
  id: string
  expression: string
  type: ConditionType
}

export type DurationType = 'impulse' | 'duration' | 'persistent'

export interface Consequence {
  id: string
  parameterId: string
  function: string
  durationType: DurationType
  duration?: number
}

export type ChainType = 'inflicted' | 'managed'

export interface ActualityStage {
  triggering: Condition
  consequences: Consequence[]
}

export interface CausalChainStages {
  potential: Condition | null
  potentiality: Condition | null
  actuality: ActualityStage | null
}

export interface CausalChain {
  id: string
  name: string
  chainType: ChainType
  sourceId: string
  targetId: string
  mitigatesChainId?: string
  stages: CausalChainStages
}

export function isComponent(obj: unknown): obj is Component {
  if (typeof obj !== 'object' || obj === null) return false
  const c = obj as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    (c.type === 'internal' || c.type === 'external') &&
    Array.isArray(c.parameters) &&
    Array.isArray(c.capacities)
  )
}

export function isParameter(obj: unknown): obj is Parameter {
  if (typeof obj !== 'object' || obj === null) return false
  const p = obj as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.value === 'number'
  )
}

export function isCapacity(obj: unknown): obj is Capacity {
  if (typeof obj !== 'object' || obj === null) return false
  const c = obj as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.min === 'number' &&
    typeof c.max === 'number'
  )
}
