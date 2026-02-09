import { useEffect, useRef } from 'react'
import { useModelStore } from '@/store/modelStore'
import { useUiStore } from '@/store/uiStore'

export function ContextMenu() {
  const contextMenuNodeId = useUiStore((s) => s.contextMenuNodeId)
  const contextMenuPosition = useUiStore((s) => s.contextMenuPosition)
  const closeContextMenu = useUiStore((s) => s.closeContextMenu)
  const openChainBuilder = useUiStore((s) => s.openChainBuilder)
  const chainBuilderOpen = useUiStore((s) => s.chainBuilderOpen)
  const removeComponent = useModelStore((s) => s.removeComponent)
  const selectNode = useUiStore((s) => s.selectNode)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        closeContextMenu()
      }
    }
    if (contextMenuNodeId) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenuNodeId, closeContextMenu])

  if (!contextMenuNodeId || !contextMenuPosition) return null

  const handleNewChain = () => {
    if (chainBuilderOpen) return
    openChainBuilder(contextMenuNodeId)
  }

  return (
    <div
      ref={menuRef}
      data-testid="context-menu"
      className="fixed z-50 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl py-1"
      style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
    >
      <button
        data-testid="context-menu-new-chain"
        className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
        onClick={handleNewChain}
      >
        New Causal Chain from here
      </button>
      <button
        data-testid="context-menu-delete"
        className="w-full text-left px-3 py-2 text-sm text-[var(--color-accent-red)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
        onClick={() => {
          removeComponent(contextMenuNodeId)
          selectNode(null)
          closeContextMenu()
        }}
      >
        Delete
      </button>
    </div>
  )
}
