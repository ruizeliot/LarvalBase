import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { nanoid } from 'nanoid'
import type { Component, CausalChain } from '@/types/model'
import type { Scenario } from '@/types/scenario'
import { useModelStore } from '@/store/modelStore'
import { useScenarioStore } from '@/store/scenarioStore'

// --- State ---
let yDoc: Y.Doc | null = null
let wsProvider: WebsocketProvider | null = null
let undoManager: Y.UndoManager | null = null
let isApplyingRemote = false
let storeUnsubscribers: (() => void)[] = []

const WS_URL = (import.meta as Record<string, Record<string, string>>).env?.VITE_YJS_WS_URL || 'ws://localhost:1234'

const USER_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

// --- Getters ---
export function getIsApplyingRemote() { return isApplyingRemote }
export function getYDoc() { return yDoc }
export function getProvider() { return wsProvider }
export function getUndoManager() { return undoManager }
export function isConnected() { return wsProvider !== null && wsProvider.wsconnected }

// --- Room Management ---

export function createRoom(displayName: string): { roomId: string; shareUrl: string } {
  const roomId = nanoid(10)
  initYjsDoc(roomId, displayName)
  pushCurrentStateToYjs()

  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  url.searchParams.set('room', roomId)
  return { roomId, shareUrl: url.toString() }
}

export function joinRoom(roomId: string, displayName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    initYjsDoc(roomId, displayName)

    if (!wsProvider) {
      reject(new Error('Failed to create WebSocket provider'))
      return
    }

    const timeout = setTimeout(() => {
      if (!wsProvider?.synced) {
        reject(new Error('Unable to connect to room'))
      }
    }, 5000)

    if (wsProvider.synced) {
      clearTimeout(timeout)
      pullStateFromYjs()
      resolve()
    } else {
      wsProvider.once('synced', () => {
        clearTimeout(timeout)
        pullStateFromYjs()
        resolve()
      })
    }
  })
}

function initYjsDoc(roomId: string, displayName: string) {
  disconnect()

  yDoc = new Y.Doc()
  wsProvider = new WebsocketProvider(WS_URL, `cascadesim-${roomId}`, yDoc)

  const colorIndex = yDoc.clientID % USER_COLORS.length
  wsProvider.awareness.setLocalStateField('user', {
    name: displayName,
    color: USER_COLORS[colorIndex],
    clientID: yDoc.clientID,
  })

  // Yjs shared maps
  const componentsMap = yDoc.getMap('components')
  const chainsMap = yDoc.getMap('chains')
  const scenariosMap = yDoc.getMap('scenarios')

  // UndoManager scoped to this user's origin
  undoManager = new Y.UndoManager([componentsMap, chainsMap, scenariosMap], {
    trackedOrigins: new Set([yDoc.clientID]),
  })

  // Observe remote changes → update Zustand
  componentsMap.observe(handleRemoteComponentsChange)
  chainsMap.observe(handleRemoteChainsChange)
  scenariosMap.observe(handleRemoteScenariosChange)
  yDoc.getMap('meta').observe(handleRemoteMetaChange)

  // Subscribe to Zustand changes → push to Yjs
  const unsubModel = useModelStore.subscribe(handleLocalModelChange)
  const unsubScenario = useScenarioStore.subscribe(handleLocalScenarioChange)
  storeUnsubscribers = [unsubModel, unsubScenario]
}

// --- State Sync ---

function pushCurrentStateToYjs() {
  if (!yDoc) return
  const { components, chains, componentCounter } = useModelStore.getState()
  const { scenarios, scenarioCounter } = useScenarioStore.getState()

  yDoc.transact(() => {
    const componentsMap = yDoc!.getMap('components')
    for (const [id, comp] of Object.entries(components)) {
      componentsMap.set(id, JSON.stringify(comp))
    }

    const chainsMap = yDoc!.getMap('chains')
    for (const [id, chain] of Object.entries(chains)) {
      chainsMap.set(id, JSON.stringify(chain))
    }

    const scenariosMap = yDoc!.getMap('scenarios')
    for (const [id, scenario] of Object.entries(scenarios)) {
      scenariosMap.set(id, JSON.stringify(scenario))
    }

    const metaMap = yDoc!.getMap('meta')
    metaMap.set('componentCounter', componentCounter)
    metaMap.set('scenarioCounter', scenarioCounter)
  }, yDoc.clientID)
}

function pullStateFromYjs() {
  if (!yDoc) return
  isApplyingRemote = true
  try {
    const componentsMap = yDoc.getMap('components')
    const chainsMap = yDoc.getMap('chains')
    const scenariosMap = yDoc.getMap('scenarios')
    const metaMap = yDoc.getMap('meta')

    const components: Record<string, Component> = {}
    componentsMap.forEach((value, key) => {
      components[key] = JSON.parse(value as string)
    })

    const chains: Record<string, CausalChain> = {}
    chainsMap.forEach((value, key) => {
      chains[key] = JSON.parse(value as string)
    })

    const scenarios: Record<string, Scenario> = {}
    scenariosMap.forEach((value, key) => {
      scenarios[key] = JSON.parse(value as string)
    })

    const componentCounter = (metaMap.get('componentCounter') as number) || 0
    const scenarioCounter = (metaMap.get('scenarioCounter') as number) || 0

    useModelStore.setState({ components, chains, componentCounter })
    useScenarioStore.setState({ scenarios, scenarioCounter })
  } finally {
    isApplyingRemote = false
  }
}

// --- Remote → Zustand observers ---

function handleRemoteComponentsChange(event: Y.YMapEvent<string>) {
  if (event.transaction.local) return
  isApplyingRemote = true
  try {
    const componentsMap = yDoc!.getMap('components')
    const components: Record<string, Component> = {}
    componentsMap.forEach((value, key) => {
      components[key] = JSON.parse(value as string)
    })
    useModelStore.setState({ components })
  } finally {
    isApplyingRemote = false
  }
}

function handleRemoteChainsChange(event: Y.YMapEvent<string>) {
  if (event.transaction.local) return
  isApplyingRemote = true
  try {
    const chainsMap = yDoc!.getMap('chains')
    const chains: Record<string, CausalChain> = {}
    chainsMap.forEach((value, key) => {
      chains[key] = JSON.parse(value as string)
    })
    useModelStore.setState({ chains })
  } finally {
    isApplyingRemote = false
  }
}

function handleRemoteScenariosChange(event: Y.YMapEvent<string>) {
  if (event.transaction.local) return
  isApplyingRemote = true
  try {
    const scenariosMap = yDoc!.getMap('scenarios')
    const scenarios: Record<string, Scenario> = {}
    scenariosMap.forEach((value, key) => {
      scenarios[key] = JSON.parse(value as string)
    })
    useScenarioStore.setState({ scenarios })
  } finally {
    isApplyingRemote = false
  }
}

function handleRemoteMetaChange(event: Y.YMapEvent<unknown>) {
  if (event.transaction.local) return
  isApplyingRemote = true
  try {
    const metaMap = yDoc!.getMap('meta')
    const componentCounter = (metaMap.get('componentCounter') as number) || 0
    const scenarioCounter = (metaMap.get('scenarioCounter') as number) || 0
    useModelStore.setState({ componentCounter })
    useScenarioStore.setState({ scenarioCounter })
  } finally {
    isApplyingRemote = false
  }
}

// --- Zustand → Yjs sync ---

function handleLocalModelChange() {
  if (isApplyingRemote || !yDoc) return
  const { components, chains, componentCounter } = useModelStore.getState()

  yDoc.transact(() => {
    const componentsMap = yDoc!.getMap('components')
    const compKeysToDelete: string[] = []
    componentsMap.forEach((_, key) => {
      if (!(key in components)) compKeysToDelete.push(key)
    })
    compKeysToDelete.forEach(k => componentsMap.delete(k))
    for (const [id, comp] of Object.entries(components)) {
      const serialized = JSON.stringify(comp)
      if (componentsMap.get(id) !== serialized) {
        componentsMap.set(id, serialized)
      }
    }

    const chainsMap = yDoc!.getMap('chains')
    const chainKeysToDelete: string[] = []
    chainsMap.forEach((_, key) => {
      if (!(key in chains)) chainKeysToDelete.push(key)
    })
    chainKeysToDelete.forEach(k => chainsMap.delete(k))
    for (const [id, chain] of Object.entries(chains)) {
      const serialized = JSON.stringify(chain)
      if (chainsMap.get(id) !== serialized) {
        chainsMap.set(id, serialized)
      }
    }

    const metaMap = yDoc!.getMap('meta')
    metaMap.set('componentCounter', componentCounter)
  }, yDoc.clientID)
}

function handleLocalScenarioChange() {
  if (isApplyingRemote || !yDoc) return
  const { scenarios, scenarioCounter } = useScenarioStore.getState()

  yDoc.transact(() => {
    const scenariosMap = yDoc!.getMap('scenarios')
    const keysToDelete: string[] = []
    scenariosMap.forEach((_, key) => {
      if (!(key in scenarios)) keysToDelete.push(key)
    })
    keysToDelete.forEach(k => scenariosMap.delete(k))
    for (const [id, scenario] of Object.entries(scenarios)) {
      const serialized = JSON.stringify(scenario)
      if (scenariosMap.get(id) !== serialized) {
        scenariosMap.set(id, serialized)
      }
    }

    const metaMap = yDoc!.getMap('meta')
    metaMap.set('scenarioCounter', scenarioCounter)
  }, yDoc.clientID)
}

// --- Undo/Redo ---

export function undo() { undoManager?.undo() }
export function redo() { undoManager?.redo() }
export function canUndo(): boolean { return (undoManager?.undoStack.length ?? 0) > 0 }
export function canRedo(): boolean { return (undoManager?.redoStack.length ?? 0) > 0 }

// --- Cleanup ---

export function disconnect() {
  storeUnsubscribers.forEach(unsub => unsub())
  storeUnsubscribers = []
  undoManager?.destroy()
  undoManager = null
  wsProvider?.disconnect()
  wsProvider?.destroy()
  wsProvider = null
  yDoc?.destroy()
  yDoc = null
}

// --- Awareness Helpers ---

export function getParticipants(): Array<{ clientID: number; name: string; color: string }> {
  if (!wsProvider) return []
  const states = wsProvider.awareness.getStates()
  const participants: Array<{ clientID: number; name: string; color: string }> = []
  states.forEach((state, clientID) => {
    if (state.user) {
      participants.push({
        clientID,
        name: state.user.name,
        color: state.user.color,
      })
    }
  })
  return participants
}
