import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      activeMode: 'editor',
      chainBuilderOpen: false,
      chainBuilderSourceId: null,
      contextMenuNodeId: null,
      contextMenuPosition: null,
    })
  })

  it('closes chain builder when mode changes', () => {
    // Open the chain builder
    useUiStore.getState().openChainBuilder('comp-1')
    expect(useUiStore.getState().chainBuilderOpen).toBe(true)
    expect(useUiStore.getState().chainBuilderSourceId).toBe('comp-1')

    // Switch mode
    useUiStore.getState().setActiveMode('scenarios')

    // Chain builder should be closed
    expect(useUiStore.getState().chainBuilderOpen).toBe(false)
    expect(useUiStore.getState().chainBuilderSourceId).toBeNull()
  })

  it('closes chain builder when switching to simulate mode', () => {
    useUiStore.getState().openChainBuilder('comp-2')
    useUiStore.getState().setActiveMode('simulate')
    expect(useUiStore.getState().chainBuilderOpen).toBe(false)
  })

  it('keeps chain builder closed if already closed on mode change', () => {
    expect(useUiStore.getState().chainBuilderOpen).toBe(false)
    useUiStore.getState().setActiveMode('scenarios')
    expect(useUiStore.getState().chainBuilderOpen).toBe(false)
  })
})
