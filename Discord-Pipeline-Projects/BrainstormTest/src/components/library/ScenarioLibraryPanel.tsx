import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { X, BookOpen, Boxes } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { useModelStore } from '@/store/modelStore'
import { useScenarioStore } from '@/store/scenarioStore'
import { prebuiltScenarios, DIFFICULTY_CONFIG, type Difficulty, type PrebuiltScenario } from '@/data/scenarioLibrary'
import { cn } from '@/lib/utils'
import { computeElkLayout } from '@/lib/elkLayout'

const FILTER_OPTIONS: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
]

export function ScenarioLibraryPanel() {
  const reactFlow = useReactFlow()
  const closeLibraryPanel = useUiStore((s) => s.closeLibraryPanel)
  const setActiveMode = useUiStore((s) => s.setActiveMode)
  const setShowInfoCards = useUiStore((s) => s.setShowInfoCards)
  const components = useModelStore((s) => s.components)
  const chains = useModelStore((s) => s.chains)

  const [filter, setFilter] = useState<Difficulty | 'all'>('all')
  const [confirmDialog, setConfirmDialog] = useState<PrebuiltScenario | null>(null)

  const filtered = filter === 'all'
    ? prebuiltScenarios
    : prebuiltScenarios.filter((s) => s.difficulty === filter)

  const hasExistingContent = Object.keys(components).length > 0 || Object.keys(chains).length > 0

  function loadScenario(scenario: PrebuiltScenario) {
    if (hasExistingContent && !confirmDialog) {
      setConfirmDialog(scenario)
      return
    }
    doLoad(scenario)
  }

  async function doLoad(scenario: PrebuiltScenario) {
    // Clear existing model
    const modelState = useModelStore.getState()
    for (const id of Object.keys(modelState.components)) {
      modelState.removeComponent(id)
    }
    for (const id of Object.keys(modelState.chains)) {
      modelState.removeChain(id)
    }

    // Clear existing scenarios
    const scenarioState = useScenarioStore.getState()
    for (const id of Object.keys(scenarioState.scenarios)) {
      scenarioState.deleteScenario(id)
    }

    // Load components
    useModelStore.setState((state) => {
      const newComponents: Record<string, typeof scenario.components[0]> = {}
      for (const comp of scenario.components) {
        newComponents[comp.id] = { ...comp }
      }
      return { components: newComponents, componentCounter: scenario.components.length }
    })

    // Load chains
    useModelStore.setState((state) => {
      const newChains: Record<string, typeof scenario.chains[0]> = {}
      for (const chain of scenario.chains) {
        newChains[chain.id] = { ...chain }
      }
      return { chains: newChains }
    })

    // Auto-layout components using ELK layered algorithm (left-to-right)
    const positions = await computeElkLayout(
      { components: scenario.components, chains: scenario.chains },
      'LR'
    )
    useModelStore.setState((state) => {
      const updated = { ...state.components }
      for (const [id, pos] of Object.entries(positions)) {
        if (updated[id]) {
          updated[id] = { ...updated[id], position: pos }
        }
      }
      return { components: updated }
    })

    // Load scenario with forced events
    useScenarioStore.setState((state) => ({
      scenarios: { [scenario.scenario.id]: { ...scenario.scenario } },
      activeScenarioId: scenario.scenario.id,
      scenarioCounter: 1,
    }))

    // Store info cards in a module-level registry for Canvas to read
    setActiveInfoCards(scenario.infoCards)
    setShowInfoCards(true)

    // Switch to editor mode and close library
    setActiveMode('editor')
    closeLibraryPanel()
    setConfirmDialog(null)

    // fitView after layout settles
    setTimeout(() => {
      reactFlow.fitView({ padding: 0.1, duration: 200 })
    }, 100)
  }

  return (
    <div data-testid="library-panel" className="absolute inset-0 z-20 bg-[var(--color-background)] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Scenario Library</h2>
        </div>
        <button
          data-testid="library-close"
          onClick={closeLibraryPanel}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter chips */}
      <div data-testid="library-filters" className="flex items-center gap-2 px-6 py-3 border-b border-[var(--color-border)]">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            data-testid={`filter-${opt.value}`}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer',
              filter === opt.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {filtered.map((scenario) => {
          const diff = DIFFICULTY_CONFIG[scenario.difficulty]
          return (
            <div
              key={scenario.id}
              data-testid={`scenario-card-${scenario.id}`}
              className="flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 data-testid="card-title" className="text-sm font-semibold text-[var(--color-text)]">
                    {scenario.title}
                  </h3>
                  <span
                    data-testid="card-difficulty"
                    data-difficulty={scenario.difficulty}
                    className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', diff.colorClass)}
                  >
                    {diff.label}
                  </span>
                </div>
                <p data-testid="card-description" className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">
                  {scenario.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                  <span data-testid="card-node-count" className="flex items-center gap-1">
                    <Boxes size={12} />
                    {scenario.nodeCount} nodes
                  </span>
                  {scenario.infoCards.length > 0 && (
                    <span data-testid="card-info-count" className="flex items-center gap-1">
                      <BookOpen size={12} />
                      {scenario.infoCards.length} info cards
                    </span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[var(--color-border)]">
                <button
                  data-testid="card-load-button"
                  onClick={() => loadScenario(scenario)}
                  className="w-full px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
                >
                  Load
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div data-testid="library-confirm-dialog" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Replace current model?</h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Your current workspace has components and chains. Loading "{confirmDialog.title}" will replace everything.
            </p>
            <div className="flex justify-end gap-2">
              <button
                data-testid="library-confirm-cancel"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 rounded-md text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                data-testid="library-confirm-ok"
                onClick={() => doLoad(confirmDialog)}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Module-level info card storage (accessed by Canvas)
let _activeInfoCards: { id: string; text: string; position: { x: number; y: number } }[] = []
let _infoCardListeners: (() => void)[] = []

export function setActiveInfoCards(cards: typeof _activeInfoCards) {
  _activeInfoCards = cards
  _infoCardListeners.forEach((fn) => fn())
}

export function getActiveInfoCards() {
  return _activeInfoCards
}

export function subscribeInfoCards(listener: () => void) {
  _infoCardListeners.push(listener)
  return () => {
    _infoCardListeners = _infoCardListeners.filter((fn) => fn !== listener)
  }
}

// Track dismissed info card IDs
let _dismissedInfoCards = new Set<string>()
let _dismissedListeners: (() => void)[] = []

export function dismissInfoCard(id: string) {
  _dismissedInfoCards = new Set([..._dismissedInfoCards, id])
  _dismissedListeners.forEach((fn) => fn())
}

export function restoreAllInfoCards() {
  _dismissedInfoCards = new Set()
  _dismissedListeners.forEach((fn) => fn())
}

export function getDismissedInfoCards() {
  return _dismissedInfoCards
}

export function subscribeDismissed(listener: () => void) {
  _dismissedListeners.push(listener)
  return () => {
    _dismissedListeners = _dismissedListeners.filter((fn) => fn !== listener)
  }
}
