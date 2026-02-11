import { useState, useEffect, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { TutorialMenu } from './TutorialMenu'

interface HelpButtonProps {
  highlightPhase?: number
  autoOpen?: boolean
}

export function HelpButton({ highlightPhase: initialHighlight, autoOpen }: HelpButtonProps) {
  const [menuOpen, setMenuOpen] = useState(autoOpen ?? false)
  const [highlightPhase, setHighlightPhase] = useState(initialHighlight)

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setHighlightPhase(undefined)
  }, [])

  // Listen for programmatic open (e.g., from WelcomeOverlay "Start Tutorial")
  useEffect(() => {
    function handleOpenMenu(e: Event) {
      const detail = (e as CustomEvent).detail
      setMenuOpen(true)
      if (detail?.highlightPhase) {
        setHighlightPhase(detail.highlightPhase)
      }
    }
    document.addEventListener('open-tutorial-menu', handleOpenMenu)
    return () => document.removeEventListener('open-tutorial-menu', handleOpenMenu)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen, closeMenu])

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      {menuOpen && (
        <div
          data-testid="help-menu-backdrop"
          className="fixed inset-0 z-40"
          onClick={closeMenu}
        />
      )}
      <div className="fixed bottom-4 right-4 z-50">
        {menuOpen && (
          <TutorialMenu
            onClose={closeMenu}
            highlightPhase={highlightPhase}
          />
        )}
        <button
          data-testid="help-button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
          title="Help"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </>
  )
}
