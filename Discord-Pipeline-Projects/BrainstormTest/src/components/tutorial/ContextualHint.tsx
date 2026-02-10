import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { FIRST_USE_PREFIX } from './tutorialConfig'

interface ContextualHintProps {
  id: string
  text: string
  autoShowKey?: string
}

export function ContextualHint({ id, text, autoShowKey }: ContextualHintProps) {
  const [open, setOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Auto-show on first use
  useEffect(() => {
    if (!autoShowKey) return
    const storageKey = `${FIRST_USE_PREFIX}${autoShowKey}`
    if (!localStorage.getItem(storageKey)) {
      setOpen(true)
      localStorage.setItem(storageKey, 'true')
    }
  }, [autoShowKey])

  // Close on click outside or Esc
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        data-testid={`hint-${id}`}
        onClick={() => setOpen(!open)}
        className="ml-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
        title="Help"
      >
        <HelpCircle size={14} />
      </button>
      {open && (
        <div
          ref={tooltipRef}
          data-testid="hint-tooltip"
          className="absolute left-6 top-0 z-[60] w-64 px-3 py-2 rounded-lg border text-xs leading-relaxed shadow-lg"
          style={{
            backgroundColor: 'rgb(18, 18, 26)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
}
