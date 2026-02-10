import { useState } from 'react'
import { HelpCircle, Play, Keyboard } from 'lucide-react'
import { useTutorialStore } from '@/store/tutorialStore'

export function HelpButton() {
  const [menuOpen, setMenuOpen] = useState(false)
  const startTour = useTutorialStore((s) => s.startTour)

  const handleReplayTutorial = () => {
    setMenuOpen(false)
    startTour()
  }

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      {menuOpen && (
        <div
          data-testid="help-menu-backdrop"
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="fixed bottom-4 right-4 z-50">
        {menuOpen && (
          <div
            data-testid="help-menu"
            className="absolute bottom-12 right-0 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden"
          >
            <button
              data-testid="help-replay-tutorial"
              onClick={handleReplayTutorial}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            >
              <Play size={14} className="text-[var(--color-primary)]" />
              Replay Tutorial
            </button>
            <button
              data-testid="help-keyboard-shortcuts"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors border-t border-[var(--color-border)] cursor-pointer"
            >
              <Keyboard size={14} className="text-[var(--color-text-muted)]" />
              Keyboard Shortcuts
            </button>
          </div>
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
