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
let heartbeatInterval: ReturnType<typeof setInterval> | null = null

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
  const userState = {
    name: displayName,
    color: USER_COLORS[colorIndex],
    clientID: yDoc.clientID,
    ts: Date.now(),
  }
  wsProvider.awareness.setLocalStateField('user', userState)

  // Heartbeat: refresh awareness timestamp so others can detect disconnects
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  heartbeatInterval = setInterval(() => {
    wsProvider?.awareness.setLocalStateField('user', {
      ...userState,
      ts: Date.now(),
    })
  }, 1000)

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
// Allow through: remote transactions AND local undo/redo transactions (origin === undoManager)
function shouldApplyToZustand(event: { transaction: { local: boolean; origin: unknown } }): boolean {
  if (!event.transaction.local) return true // remote change
  if (event.transaction.origin === undoManager) return true // undo/redo
  return false
}

function handleRemoteComponentsChange(event: Y.YMapEvent<string>) {
  if (!shouldApplyToZustand(event)) return
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
  if (!shouldApplyToZustand(event)) return
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
  if (!shouldApplyToZustand(event)) return
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
  if (!shouldApplyToZustand(event as Y.YMapEvent<string>)) return
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

// --- Activity Tracking ---

export interface ActivityEntry {
  id: string
  userName: string
  userColor: string
  action: 'added' | 'edited' | 'deleted' | 'modified'
  entityType: 'component' | 'chain' | 'scenario'
  entityName: string
  timestamp: number
}

const EDIT_DEBOUNCE_MS = 2000
const lastEditTimestamps = new Map<string, number>()

function getLocalUserInfo(): { name: string; color: string } | null {
  if (!wsProvider) return null
  const state = wsProvider.awareness.getLocalState()
  return state?.user ? { name: state.user.name, color: state.user.color } : null
}

function pushActivity(action: ActivityEntry['action'], entityType: ActivityEntry['entityType'], entityName: string) {
  if (!yDoc) return
  const user = getLocalUserInfo()
  if (!user) return
  const activitiesArray = yDoc.getArray<string>('activities')
  const entry: ActivityEntry = {
    id: nanoid(6),
    userName: user.name,
    userColor: user.color,
    action,
    entityType,
    entityName,
    timestamp: Date.now(),
  }
  yDoc.transact(() => {
    activitiesArray.push([JSON.stringify(entry)])
  }, yDoc.clientID)
}

function stripPosition(comp: Component): Omit<Component, 'position'> {
  const { position, ...rest } = comp
  return rest
}

export function getActivities(): ActivityEntry[] {
  if (!yDoc) return []
  const activitiesArray = yDoc.getArray<string>('activities')
  const entries: ActivityEntry[] = []
  for (let i = 0; i < activitiesArray.length; i++) {
    entries.push(JSON.parse(activitiesArray.get(i)))
  }
  entries.sort((a, b) => b.timestamp - a.timestamp)
  return entries.slice(0, 20)
}

export function onActivitiesChange(callback: () => void): () => void {
  if (!yDoc) return () => {}
  const activitiesArray = yDoc.getArray<string>('activities')
  activitiesArray.observe(callback)
  return () => activitiesArray.unobserve(callback)
}

// --- Zustand → Yjs sync ---

function handleLocalModelChange() {
  if (isApplyingRemote || !yDoc) return
  const { components, chains, componentCounter } = useModelStore.getState()

  // Activity tracking — detect changes before sync
  const componentsMap = yDoc.getMap('components')
  for (const [id, comp] of Object.entries(components)) {
    if (!componentsMap.has(id)) {
      pushActivity('added', 'component', comp.name)
    } else {
      const existing = JSON.parse(componentsMap.get(id) as string) as Component
      if (JSON.stringify(stripPosition(existing)) !== JSON.stringify(stripPosition(comp))) {
        const key = `comp-${id}`
        const lastEdit = lastEditTimestamps.get(key)
        if (!lastEdit || Date.now() - lastEdit > EDIT_DEBOUNCE_MS) {
          pushActivity('edited', 'component', comp.name)
          lastEditTimestamps.set(key, Date.now())
        }
      }
    }
  }
  componentsMap.forEach((value, key) => {
    if (!(key in components)) {
      const deleted = JSON.parse(value as string) as Component
      pushActivity('deleted', 'component', deleted.name)
    }
  })

  const chainsMap = yDoc.getMap('chains')
  for (const [id, chain] of Object.entries(chains)) {
    if (!chainsMap.has(id)) {
      pushActivity('added', 'chain', chain.name)
    } else {
      const existing = JSON.parse(chainsMap.get(id) as string) as CausalChain
      if (JSON.stringify(existing) !== JSON.stringify(chain)) {
        const key = `chain-${id}`
        const lastEdit = lastEditTimestamps.get(key)
        if (!lastEdit || Date.now() - lastEdit > EDIT_DEBOUNCE_MS) {
          pushActivity('edited', 'chain', chain.name)
          lastEditTimestamps.set(key, Date.now())
        }
      }
    }
  }
  chainsMap.forEach((value, key) => {
    if (!(key in chains)) {
      const deleted = JSON.parse(value as string) as CausalChain
      pushActivity('deleted', 'chain', deleted.name)
    }
  })

  // Sync to Yjs
  yDoc.transact(() => {
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

  // Activity tracking for scenarios
  const scenariosMap = yDoc.getMap('scenarios')
  for (const [id, scenario] of Object.entries(scenarios)) {
    if (!scenariosMap.has(id)) {
      pushActivity('added', 'scenario', scenario.name)
    } else {
      const existing = JSON.parse(scenariosMap.get(id) as string) as Scenario
      if (JSON.stringify(existing) !== JSON.stringify(scenario)) {
        const key = `scenario-${id}`
        const lastEdit = lastEditTimestamps.get(key)
        if (!lastEdit || Date.now() - lastEdit > EDIT_DEBOUNCE_MS) {
          pushActivity('modified', 'scenario', scenario.name)
          lastEditTimestamps.set(key, Date.now())
        }
      }
    }
  }
  scenariosMap.forEach((value, key) => {
    if (!(key in scenarios)) {
      const deleted = JSON.parse(value as string) as Scenario
      pushActivity('deleted', 'scenario', deleted.name)
    }
  })

  // Sync to Yjs
  yDoc.transact(() => {
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
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  undoManager?.destroy()
  undoManager = null
  wsProvider?.disconnect()
  wsProvider?.destroy()
  wsProvider = null
  yDoc?.destroy()
  yDoc = null
}

// --- Awareness Helpers ---

const USER_STALE_MS = 4000

export function getParticipants(): Array<{ clientID: number; name: string; color: string }> {
  if (!wsProvider || !yDoc) return []
  const localClientID = yDoc.clientID
  const now = Date.now()
  const states = wsProvider.awareness.getStates()
  const participants: Array<{ clientID: number; name: string; color: string }> = []
  states.forEach((state, clientID) => {
    if (state.user) {
      // Skip stale remote users (heartbeat not received recently)
      if (clientID !== localClientID && state.user.ts && now - state.user.ts > USER_STALE_MS) return
      participants.push({
        clientID,
        name: state.user.name,
        color: state.user.color,
      })
    }
  })
  return participants
}

// --- Cursor Awareness ---

export function setCursorPosition(position: { x: number; y: number } | null) {
  if (!wsProvider) return
  wsProvider.awareness.setLocalStateField('cursor', position ? { ...position, ts: Date.now() } : null)
}

export interface RemoteCursor {
  clientID: number
  name: string
  color: string
  cursor: { x: number; y: number }
}

const CURSOR_STALE_MS = 3000

export function getRemoteCursors(): RemoteCursor[] {
  if (!wsProvider || !yDoc) return []
  const localClientID = yDoc.clientID
  const now = Date.now()
  const states = wsProvider.awareness.getStates()
  const cursors: RemoteCursor[] = []
  states.forEach((state, clientID) => {
    if (clientID === localClientID) return
    if (state.user && state.cursor) {
      // Filter out stale cursors (user disconnected or moved off canvas)
      if (state.cursor.ts && now - state.cursor.ts > CURSOR_STALE_MS) return
      cursors.push({
        clientID,
        name: state.user.name,
        color: state.user.color,
        cursor: { x: state.cursor.x, y: state.cursor.y },
      })
    }
  })
  return cursors
}

export function onAwarenessChange(callback: () => void): () => void {
  if (!wsProvider) return () => {}
  wsProvider.awareness.on('change', callback)
  return () => wsProvider?.awareness.off('change', callback)
}

// --- Edit Indicator Awareness ---

export function setSelectedNode(nodeId: string | null) {
  if (!wsProvider) return
  wsProvider.awareness.setLocalStateField('selectedNode', nodeId)
}

export interface RemoteSelection {
  clientID: number
  name: string
  color: string
  nodeId: string
}

export function getRemoteSelections(): RemoteSelection[] {
  if (!wsProvider || !yDoc) return []
  const localClientID = yDoc.clientID
  const now = Date.now()
  const states = wsProvider.awareness.getStates()
  const selections: RemoteSelection[] = []
  states.forEach((state, clientID) => {
    if (clientID === localClientID) return
    if (state.user && state.selectedNode) {
      // Filter out stale users
      if (state.user.ts && now - state.user.ts > USER_STALE_MS) return
      selections.push({
        clientID,
        name: state.user.name,
        color: state.user.color,
        nodeId: state.selectedNode,
      })
    }
  })
  return selections
}
