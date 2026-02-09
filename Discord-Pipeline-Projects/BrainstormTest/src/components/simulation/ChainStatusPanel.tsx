import { useMemo } from 'react'
import { useModelStore } from '@/store/modelStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUiStore } from '@/store/uiStore'
import { evaluateChainStages, type ChainStageStatus } from '@/engine/chainStageEvaluator'

const STAGES = ['potential', 'potentiality', 'actuality'] as const
const STAGE_LABELS = ['Existence', 'Susceptibility', 'Triggering']

function stageIndex(status: ChainStageStatus): number {
  switch (status) {
    case 'potential': return 0
    case 'potentiality': return 1
    case 'actuality': return 2
    default: return -1
  }
}

export function ChainStatusPanel() {
  const components = useModelStore((s) => s.components)
  const chains = useModelStore((s) => s.chains)
  const activeMode = useUiStore((s) => s.activeMode)
  const simResult = useSimulationStore((s) => s.result)
  const currentStep = useSimulationStore((s) => s.currentStep)

  const chainStages = useMemo(() => {
    if (activeMode !== 'simulate' || !simResult || simResult.timesteps.length === 0) return {}
    const snapshot = simResult.timesteps[currentStep]?.snapshot ?? {}
    return evaluateChainStages(components, chains, snapshot)
  }, [activeMode, simResult, currentStep, components, chains])

  const chainList = Object.values(chains)

  if (chainList.length === 0) return null

  return (
    <div data-testid="chain-status-panel" className="p-3 flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Chain Status
      </h3>
      {chainList.map((chain) => {
        const status = chainStages[chain.id] ?? 'none'
        const activeIdx = stageIndex(status)

        return (
          <div
            key={chain.id}
            data-testid={`chain-status-${chain.name}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
          >
            <div className="flex gap-1">
              {STAGES.map((stage, i) => {
                const isFilled = i <= activeIdx
                return (
                  <span
                    key={stage}
                    data-testid={isFilled ? 'stage-indicator-filled' : 'stage-indicator'}
                    title={STAGE_LABELS[i]}
                    className="text-xs"
                    style={{
                      color: isFilled ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                    }}
                  >
                    {isFilled ? '●' : '○'}
                  </span>
                )
              })}
            </div>
            <span className="text-xs text-[var(--color-text)] truncate">{chain.name}</span>
          </div>
        )
      })}
    </div>
  )
}
