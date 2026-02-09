import { useState, useRef, useEffect } from 'react'
import type { Component } from '@/types/model'

interface FormulaEditorProps {
  value: string
  onChange: (value: string) => void
  components: Record<string, Component>
  testId: string
  placeholder?: string
}

export function FormulaEditor({ value, onChange, components, testId, placeholder }: FormulaEditorProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allRefs = Object.values(components).flatMap((c) => [
    ...c.parameters.map((p) => `${c.name}.${p.name}`),
    ...c.capacities.map((cap) => `${c.name}.${cap.name}`),
  ])

  const handleChange = (newValue: string) => {
    onChange(newValue)

    // Find the current word being typed (last token after space or operator)
    const cursorPos = inputRef.current?.selectionStart ?? newValue.length
    const textUpToCursor = newValue.slice(0, cursorPos)
    const lastTokenMatch = textUpToCursor.match(/([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)$/)
    const lastToken = lastTokenMatch ? lastTokenMatch[1] : ''

    if (lastToken.length >= 1) {
      const filtered = allRefs.filter((ref) =>
        ref.toLowerCase().startsWith(lastToken.toLowerCase()) && ref.toLowerCase() !== lastToken.toLowerCase()
      )
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedSuggestionIndex(0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const applySuggestion = (suggestion: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? value.length
    const textUpToCursor = value.slice(0, cursorPos)
    const textAfterCursor = value.slice(cursorPos)
    const lastTokenMatch = textUpToCursor.match(/([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)$/)
    const lastToken = lastTokenMatch ? lastTokenMatch[1] : ''
    const beforeToken = textUpToCursor.slice(0, textUpToCursor.length - lastToken.length)
    const newValue = beforeToken + suggestion + textAfterCursor
    onChange(newValue)
    setShowSuggestions(false)
    setSuggestions([])
    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applySuggestion(suggestions[selectedSuggestionIndex])
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
        placeholder={placeholder}
        data-testid={testId}
        className="flex h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] font-mono"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg max-h-[150px] overflow-y-auto"
          data-testid="autocomplete-dropdown"
        >
          {suggestions.map((s, i) => (
            <button
              key={s}
              data-testid="autocomplete-suggestion"
              className={`w-full text-left px-3 py-1.5 text-xs font-mono cursor-pointer ${
                i === selectedSuggestionIndex
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
              onMouseDown={(e) => { e.preventDefault(); applySuggestion(s) }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
