import { create } from 'zustand'

export type AppMode = 'editor' | 'scenarios' | 'simulate'

export type ChainViewMode = 'detailed' | 'compact'

interface UiState {
  activeMode: AppMode
  selectedNodeId: string | null
  leftPanelOpen: boolean
  bottomPanelOpen: boolean
  chainBuilderOpen: boolean
  chainBuilderSourceId: string | null
  contextMenuNodeId: string | null
  contextMenuPosition: { x: number; y: number } | null
  chainViewMode: ChainViewMode

  setActiveMode: (mode: AppMode) => void
  selectNode: (id: string | null) => void
  toggleLeftPanel: () => void
  toggleBottomPanel: () => void
  setLeftPanelOpen: (open: boolean) => void
  openChainBuilder: (sourceId: string) => void
  closeChainBuilder: () => void
  openContextMenu: (nodeId: string, position: { x: number; y: number }) => void
  closeContextMenu: () => void
  toggleChainViewMode: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeMode: 'editor',
  selectedNodeId: null,
  leftPanelOpen: true,
  bottomPanelOpen: false,
  chainBuilderOpen: false,
  chainBuilderSourceId: null,
  contextMenuNodeId: null,
  contextMenuPosition: null,
  chainViewMode: 'detailed',

  setActiveMode: (mode) => set({ activeMode: mode }),
  selectNode: (id) => set({ selectedNodeId: id }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  openChainBuilder: (sourceId) => set({ chainBuilderOpen: true, chainBuilderSourceId: sourceId, contextMenuNodeId: null, contextMenuPosition: null }),
  closeChainBuilder: () => set({ chainBuilderOpen: false, chainBuilderSourceId: null }),
  openContextMenu: (nodeId, position) => set({ contextMenuNodeId: nodeId, contextMenuPosition: position }),
  closeContextMenu: () => set({ contextMenuNodeId: null, contextMenuPosition: null }),
  toggleChainViewMode: () => set((s) => ({ chainViewMode: s.chainViewMode === 'detailed' ? 'compact' : 'detailed' })),
}))
