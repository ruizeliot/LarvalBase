import { useSimulationStore } from '@/store/simulationStore'
import { useScenarioStore } from '@/store/scenarioStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Play, RotateCcw } from 'lucide-react'
import { ContextualHint } from '@/components/tutorial/ContextualHint'

export function SimulationControls() {
  const config = useSimulationStore((s) => s.config)
  const running = useSimulationStore((s) => s.running)
  const error = useSimulationStore((s) => s.error)
  const result = useSimulationStore((s) => s.result)
  const setSelectedScenario = useSimulationStore((s) => s.setSelectedScenario)
  const setTimeStep = useSimulationStore((s) => s.setTimeStep)
  const setMaxIterations = useSimulationStore((s) => s.setMaxIterations)
  const run = useSimulationStore((s) => s.run)
  const reset = useSimulationStore((s) => s.reset)
  const scenarios = useScenarioStore((s) => s.scenarios)

  const scenarioList = Object.values(scenarios)

  return (
    <div className="p-3 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Simulation
      </h3>

      {/* Scenario selector */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Scenario</label>
        <Select
          value={config.selectedScenarioId ?? ''}
          onChange={(e) => setSelectedScenario(e.target.value || null)}
          data-testid="sim-scenario-select"
        >
          <option value="">Select scenario...</option>
          {scenarioList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Time step */}
      <div>
        <span className="flex items-center mb-1">
          <label className="text-xs text-[var(--color-text-muted)]">Time Step</label>
          <ContextualHint
            id="sim-timestep"
            text="Time step controls the granularity of the simulation. Smaller values give more precise results but take longer to compute. Each step advances the simulation clock by this many seconds."
          />
        </span>
        <Input
          type="number"
          min={1}
          value={config.timeStep}
          onChange={(e) => setTimeStep(Math.max(1, Number(e.target.value)))}
          data-testid="sim-timestep"
        />
      </div>

      {/* Max iterations */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Max Iterations</label>
        <Input
          type="number"
          min={1}
          value={config.maxIterations}
          onChange={(e) => setMaxIterations(Math.max(1, Number(e.target.value)))}
          data-testid="sim-max-iterations"
        />
      </div>

      {/* Run / Reset buttons */}
      <div className="flex gap-2">
        <Button
          onClick={run}
          disabled={running || !config.selectedScenarioId}
          className="flex-1"
          data-testid="sim-run-button"
        >
          <Play size={14} />
          {running ? 'Running...' : 'Run Simulation'}
        </Button>
        {result && (
          <Button
            variant="secondary"
            onClick={reset}
            data-testid="sim-reset-button"
          >
            <RotateCcw size={14} />
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="px-3 py-2 rounded-md bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-xs text-[var(--color-accent-red)]"
          data-testid="sim-error"
        >
          {error}
        </div>
      )}

      {/* Quick stats when results exist */}
      {result && (
        <div
          className="px-3 py-2 rounded-md bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30"
          data-testid="sim-summary-badge"
        >
          <div className="text-xs text-[var(--color-accent-green)] font-medium">Simulation Complete</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
            {result.totalSteps} steps &middot; {result.componentsAffected} components affected
          </div>
        </div>
      )}
    </div>
  )
}
