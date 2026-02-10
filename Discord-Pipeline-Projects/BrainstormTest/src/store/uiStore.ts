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
  libraryPanelOpen: boolean
  showInfoCards: boolean
  resultsPanelOpen: boolean
  resultsPanelWidth: number

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
  openLibraryPanel: () => void
  closeLibraryPanel: () => void
  toggleInfoCards: () => void
  setShowInfoCards: (show: boolean) => void
  toggleResultsPanel: () => void
  setResultsPanelWidth: (width: number) => void
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
  libraryPanelOpen: false,
  showInfoCards: true,
  resultsPanelOpen: true,
  resultsPanelWidth: 350,

  setActiveMode: (mode) => set({ activeMode: mode, chainBuilderOpen: false, chainBuilderSourceId: null }),
  selectNode: (id) => set({ selectedNodeId: id }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  openChainBuilder: (sourceId) => set({ chainBuilderOpen: true, chainBuilderSourceId: sourceId, contextMenuNodeId: null, contextMenuPosition: null }),
  closeChainBuilder: () => set({ chainBuilderOpen: false, chainBuilderSourceId: null }),
  openContextMenu: (nodeId, position) => set({ contextMenuNodeId: nodeId, contextMenuPosition: position }),
  closeContextMenu: () => set({ contextMenuNodeId: null, contextMenuPosition: null }),
  toggleChainViewMode: () => set((s) => ({ chainViewMode: s.chainViewMode === 'detailed' ? 'compact' : 'detailed' })),
  openLibraryPanel: () => set({ libraryPanelOpen: true }),
  closeLibraryPanel: () => set({ libraryPanelOpen: false }),
  toggleInfoCards: () => set((s) => ({ showInfoCards: !s.showInfoCards })),
  setShowInfoCards: (show) => set({ showInfoCards: show }),
  toggleResultsPanel: () => set((s) => ({ resultsPanelOpen: !s.resultsPanelOpen })),
  setResultsPanelWidth: (width) => set({ resultsPanelWidth: Math.max(250, Math.min(500, width)) }),
}))
