import { useState } from 'react'
import { useScenarioStore } from '@/store/scenarioStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Copy, Trash2 } from 'lucide-react'

export function ScenarioList() {
  const scenarios = useScenarioStore((s) => s.scenarios)
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId)
  const createScenario = useScenarioStore((s) => s.createScenario)
  const deleteScenario = useScenarioStore((s) => s.deleteScenario)
  const duplicateScenario = useScenarioStore((s) => s.duplicateScenario)
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario)

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const scenarioList = Object.values(scenarios)
  const pendingScenario = pendingDeleteId ? scenarios[pendingDeleteId] : null

  return (
    <div className="p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Scenarios
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={createScenario}
          data-testid="create-scenario"
        >
          <Plus size={12} />
          New
        </Button>
      </div>

      {scenarioList.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)] text-center">
            No scenarios yet.<br />Click "New" to create one.
          </p>
        </div>
      )}

      <div className="space-y-1 flex-1 overflow-y-auto">
        {scenarioList.map((scenario) => (
          <div
            key={scenario.id}
            data-testid={`scenario-item-${scenario.id}`}
            onClick={() => setActiveScenario(scenario.id)}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group',
              activeScenarioId === scenario.id
                ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30'
                : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
            )}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm text-[var(--color-text)] truncate">{scenario.name}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {scenario.forcedEvents.length} event{scenario.forcedEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateScenario(scenario.id)
                }}
                data-testid={`duplicate-scenario-${scenario.id}`}
                title="Duplicate"
              >
                <Copy size={12} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-[var(--color-accent-red)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDeleteId(scenario.id)
                }}
                data-testid={`delete-scenario-${scenario.id}`}
                title="Delete"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      {pendingScenario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="scenario-delete-confirm"
        >
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 max-w-sm shadow-xl">
            <p className="text-sm text-[var(--color-text)] mb-3">
              Delete scenario "{pendingScenario.name}"?
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              This will remove the scenario and all its forced events.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPendingDeleteId(null)}
                data-testid="scenario-delete-cancel"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  deleteScenario(pendingDeleteId!)
                  setPendingDeleteId(null)
                }}
                data-testid="scenario-delete-ok"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
