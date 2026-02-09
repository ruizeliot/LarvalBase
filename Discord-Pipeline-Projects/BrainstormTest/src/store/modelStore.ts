import { create } from 'zustand'
import type { Node } from '@xyflow/react'
import type { Component, Parameter, Capacity, CausalChain, ComponentType, ChainType, Condition, Consequence, ActualityStage } from '@/types/model'
import { createId } from '@/lib/id'

interface ModelState {
  components: Record<string, Component>
  chains: Record<string, CausalChain>
  componentCounter: number

  // Component actions
  addComponent: (type: ComponentType, position: { x: number; y: number }) => string
  updateComponent: (id: string, updates: Partial<Pick<Component, 'name' | 'type'>>) => void
  removeComponent: (id: string) => void

  // Parameter actions
  addParameter: (componentId: string) => void
  updateParameter: (componentId: string, paramId: string, updates: Partial<Pick<Parameter, 'name' | 'value'>>) => void
  removeParameter: (componentId: string, paramId: string) => void

  // Capacity actions
  addCapacity: (componentId: string) => void
  updateCapacity: (componentId: string, capId: string, updates: Partial<Pick<Capacity, 'name' | 'min' | 'max'>>) => void
  removeCapacity: (componentId: string, capId: string) => void

  // Position
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void

  // Chain actions
  addChain: (chain: Omit<CausalChain, 'id'>) => string
  updateChain: (id: string, updates: Partial<CausalChain>) => void
  removeChain: (id: string) => void

  // Derived
  getReactFlowNodes: () => Node[]
}

export const useModelStore = create<ModelState>((set, get) => ({
  components: {},
  chains: {},
  componentCounter: 0,

  addComponent: (type, position) => {
    const id = createId()
    const counter = get().componentCounter + 1
    const component: Component = {
      id,
      name: `Component ${counter}`,
      type,
      parameters: [],
      capacities: [],
      position,
    }
    set((state) => ({
      components: { ...state.components, [id]: component },
      componentCounter: counter,
    }))
    return id
  },

  updateComponent: (id, updates) => {
    set((state) => {
      const component = state.components[id]
      if (!component) return state
      const updated = { ...component, ...updates }
      // If switching to external, clear capacities
      if (updates.type === 'external') {
        updated.capacities = []
      }
      return { components: { ...state.components, [id]: updated } }
    })
  },

  removeComponent: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.components
      // Also remove chains referencing this component
      const chains = { ...state.chains }
      for (const [chainId, chain] of Object.entries(chains)) {
        if (chain.sourceId === id || chain.targetId === id) {
          delete chains[chainId]
        }
      }
      return { components: rest, chains }
    })
  },

  addParameter: (componentId) => {
    set((state) => {
      const component = state.components[componentId]
      if (!component) return state
      const param: Parameter = {
        id: createId(),
        name: `param_${component.parameters.length + 1}`,
        value: 0,
      }
      return {
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            parameters: [...component.parameters, param],
          },
        },
      }
    })
  },

  updateParameter: (componentId, paramId, updates) => {
    set((state) => {
      const component = state.components[componentId]
      if (!component) return state
      return {
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            parameters: component.parameters.map((p) =>
              p.id === paramId ? { ...p, ...updates } : p
            ),
          },
        },
      }
    })
  },

  removeParameter: (componentId, paramId) => {
    set((state) => {
      const component = state.components[componentId]
      if (!component) return state
      return {
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            parameters: component.parameters.filter((p) => p.id !== paramId),
          },
        },
      }
    })
  },

  addCapacity: (componentId) => {
    set((state) => {
      const component = state.components[componentId]
      if (!component || component.type !== 'internal') return state
      const cap: Capacity = {
        id: createId(),
        name: `capacity_${component.capacities.length + 1}`,
        min: 0,
        max: 100,
      }
      return {
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            capacities: [...component.capacities, cap],
          },
        },
      }
    })
  },

  updateCapacity: (componentId, capId, updates) => {
    set((state) => {
      const component = state.components[componentId]
      if (!component) return state
      return {
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            capacities: component.capacities.map((c) =>
              c.id === capId ? { ...c, ...updates } : c
            ),
          },
        },
      }
    })
  },

  removeCapacity: (componentId, capId) => {
    set((state) => {
      const component = state.components[componentId]
      if (!component) return state
      return {
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            capacities: component.capacities.filter((c) => c.id !== capId),
          },
        },
      }
    })
  },

  addChain: (chainData) => {
    const id = createId()
    const chain: CausalChain = { ...chainData, id }
    set((state) => ({
      chains: { ...state.chains, [id]: chain },
    }))
    return id
  },

  updateChain: (id, updates) => {
    set((state) => {
      const chain = state.chains[id]
      if (!chain) return state
      return { chains: { ...state.chains, [id]: { ...chain, ...updates } } }
    })
  },

  removeChain: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.chains
      return { chains: rest }
    })
  },

  updateComponentPosition: (id, position) => {
    set((state) => {
      const component = state.components[id]
      if (!component) return state
      return {
        components: {
          ...state.components,
          [id]: { ...component, position },
        },
      }
    })
  },

  getReactFlowNodes: () => {
    const { components } = get()
    return Object.values(components).map((comp): Node => ({
      id: comp.id,
      type: 'component',
      position: comp.position,
      data: comp,
    }))
  },
}))
