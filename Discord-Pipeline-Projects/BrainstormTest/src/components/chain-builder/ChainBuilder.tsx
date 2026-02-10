import { useState } from 'react'
import { useModelStore } from '@/store/modelStore'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { createId } from '@/lib/id'
import type { ChainType, Consequence, DurationType } from '@/types/model'
import { FormulaEditor } from './FormulaEditor'
import { ContextualHint } from '@/components/tutorial/ContextualHint'

export function ChainBuilder() {
  const chainBuilderOpen = useUiStore((s) => s.chainBuilderOpen)
  const chainBuilderSourceId = useUiStore((s) => s.chainBuilderSourceId)
  const closeChainBuilder = useUiStore((s) => s.closeChainBuilder)
  const components = useModelStore((s) => s.components)
  const chains = useModelStore((s) => s.chains)
  const addChain = useModelStore((s) => s.addChain)

  const [chainName, setChainName] = useState('')
  const [chainType, setChainType] = useState<ChainType | null>(null)
  const [mitigatesChainId, setMitigatesChainId] = useState<string>('')

  // Stage 1: Existence condition
  const [existenceFormula, setExistenceFormula] = useState('')
  const [existenceError, setExistenceError] = useState<string | null>(null)

  // Stage 2: Target + susceptibility
  const [targetId, setTargetId] = useState<string>('')
  const [susceptibilityFormula, setSusceptibilityFormula] = useState('')
  const [susceptibilityError, setSusceptibilityError] = useState<string | null>(null)

  // Stage 3: Triggering + consequences
  const [triggeringFormula, setTriggeringFormula] = useState('')
  const [triggeringError, setTriggeringError] = useState<string | null>(null)
  const [consequences, setConsequences] = useState<Array<{
    id: string
    parameterId: string
    formula: string
    durationType: DurationType
    duration?: number
  }>>([])
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!chainBuilderOpen || !chainBuilderSourceId) return null

  const sourceComponent = components[chainBuilderSourceId]
  if (!sourceComponent) return null

  const internalComponents = Object.values(components).filter((c) => c.type === 'internal')
  const existingChains = Object.values(chains)
  const targetComponent = targetId ? components[targetId] : null

  const validateFormula = (formula: string): string | null => {
    if (!formula.trim()) return 'Condition is required'

    // Check for component.parameter references
    const refPattern = /([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g
    let match
    while ((match = refPattern.exec(formula)) !== null) {
      const compName = match[1]
      if (compName === 'DURATION') continue
      const paramName = match[2]
      const comp = Object.values(components).find((c) => c.name === compName)
      if (!comp) return `"${compName}" not found`
      const param = comp.parameters.find((p) => p.name === paramName)
      const cap = comp.capacities.find((c) => c.name === paramName)
      if (!param && !cap) return `Parameter "${paramName}" not found on component "${compName}"`
    }
    return null
  }

  const handleSave = () => {
    setSaveError(null)

    if (!chainType) { setSaveError('Select a chain type'); return }
    if (!chainName.trim()) { setSaveError('Chain name is required'); return }

    // Validate Stage 1
    const e1 = validateFormula(existenceFormula)
    if (e1) { setExistenceError(e1); return }
    setExistenceError(null)

    // Validate Stage 2
    if (!targetId) { setSaveError('Select a target component'); return }
    const e2 = validateFormula(susceptibilityFormula)
    if (e2) { setSusceptibilityError(e2); return }
    setSusceptibilityError(null)

    // Validate Stage 3
    const e3 = validateFormula(triggeringFormula)
    if (e3) { setTriggeringError(e3); return }
    setTriggeringError(null)

    if (consequences.length === 0) { setSaveError('At least one consequence is required'); return }

    for (const c of consequences) {
      if (!c.parameterId) { setSaveError('Select a parameter for each consequence'); return }
      if (!c.formula.trim()) { setSaveError('Each consequence needs a formula'); return }
      if (c.durationType === 'duration' && (c.duration === undefined || c.duration <= 0)) {
        setSaveError('Duration-based consequences require a duration value'); return
      }
    }

    addChain({
      name: chainName,
      chainType,
      sourceId: chainBuilderSourceId,
      targetId,
      mitigatesChainId: chainType === 'managed' && mitigatesChainId ? mitigatesChainId : undefined,
      stages: {
        potential: { id: createId(), expression: existenceFormula, type: 'existence' },
        potentiality: { id: createId(), expression: susceptibilityFormula, type: 'susceptibility' },
        actuality: {
          triggering: { id: createId(), expression: triggeringFormula, type: 'triggering' },
          consequences: consequences.map((c) => ({
            id: createId(),
            parameterId: c.parameterId,
            function: c.formula,
            durationType: c.durationType,
            duration: c.durationType === 'duration' ? c.duration : undefined,
          })),
        },
      },
    })

    closeChainBuilder()
  }

  const addConsequence = () => {
    setConsequences([...consequences, {
      id: createId(),
      parameterId: '',
      formula: '',
      durationType: 'impulse',
    }])
  }

  const updateConsequence = (id: string, updates: Partial<typeof consequences[0]>) => {
    setConsequences(consequences.map((c) => c.id === id ? { ...c, ...updates } : c))
  }

  const removeConsequence = (id: string) => {
    setConsequences(consequences.filter((c) => c.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-testid="chain-builder">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl w-[560px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <span className="flex items-center">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">New Causal Chain</h2>
            <ContextualHint
              id="chain-builder"
              text="Causal chains model cause-and-effect relationships. Define existence conditions, target susceptibility, and triggering formulas to create cascading effects between components."
              autoShowKey="chain-builder"
            />
          </span>
          <button onClick={closeChainBuilder} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Source (read-only) */}
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Source Component</label>
            <div data-testid="chain-builder-source" className="text-sm text-[var(--color-text)] bg-[var(--color-background)] px-3 py-2 rounded border border-[var(--color-border)]">
              {sourceComponent.name}
            </div>
          </div>

          {/* Chain name */}
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Chain Name</label>
            <Input
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              placeholder="e.g. Rising Water"
              data-testid="chain-name"
            />
          </div>

          {/* Chain Type Selection */}
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Chain Type</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chainType === 'inflicted' ? 'default' : 'secondary'}
                onClick={() => setChainType('inflicted')}
                data-testid="chain-type-inflicted"
              >
                Inflicted
              </Button>
              <Button
                size="sm"
                variant={chainType === 'managed' ? 'default' : 'secondary'}
                onClick={() => setChainType('managed')}
                data-testid="chain-type-managed"
              >
                Managed
              </Button>
            </div>
          </div>

          {/* Mitigates dropdown (managed only) */}
          {chainType === 'managed' && (
            <div data-testid="chain-mitigates-section">
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Mitigates</label>
              <select
                data-testid="chain-mitigates-select"
                value={mitigatesChainId}
                onChange={(e) => setMitigatesChainId(e.target.value)}
                className="w-full h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
              >
                <option value="">{existingChains.length === 0 ? 'No chains available' : 'Select chain...'}</option>
                {existingChains.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Stage 1: Existence Condition */}
          {chainType && (
            <div data-testid="stage-1-section">
              <label className="text-xs font-semibold text-[var(--color-primary)] mb-1 block">
                Stage 1 — Potential (Existence Condition)
              </label>
              <FormulaEditor
                value={existenceFormula}
                onChange={(v) => { setExistenceFormula(v); setExistenceError(null) }}
                components={components}
                testId="formula-editor-existence"
                placeholder="e.g. River.waterLevel > 8"
              />
              {existenceError && (
                <p className="text-[10px] text-[var(--color-accent-red)] mt-1" data-testid="formula-error">{existenceError}</p>
              )}
            </div>
          )}

          {/* Stage 2: Potentiality */}
          {chainType && (
            <div data-testid="stage-2-section">
              <label className="text-xs font-semibold text-[var(--color-accent-orange)] mb-1 block">
                Stage 2 — Potentiality (Susceptibility Condition)
              </label>
              <div className="mb-2">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Target Component (internal only)</label>
                <select
                  data-testid="target-selector"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
                >
                  <option value="">Select target...</option>
                  {internalComponents.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <FormulaEditor
                value={susceptibilityFormula}
                onChange={(v) => { setSusceptibilityFormula(v); setSusceptibilityError(null) }}
                components={components}
                testId="formula-editor-susceptibility"
                placeholder="e.g. Dam.pressure > Dam.maxPressure * 0.5"
              />
              {susceptibilityError && (
                <p className="text-[10px] text-[var(--color-accent-red)] mt-1" data-testid="formula-error">{susceptibilityError}</p>
              )}
            </div>
          )}

          {/* Stage 3: Actuality */}
          {chainType && (
            <div data-testid="stage-3-section">
              <label className="text-xs font-semibold text-[var(--color-accent-red)] mb-1 block">
                Stage 3 — Actuality (Triggering & Consequences)
              </label>
              <FormulaEditor
                value={triggeringFormula}
                onChange={(v) => { setTriggeringFormula(v); setTriggeringError(null) }}
                components={components}
                testId="formula-editor-triggering"
                placeholder="e.g. Dam.integrity < 60"
              />
              {triggeringError && (
                <p className="text-[10px] text-[var(--color-accent-red)] mt-1" data-testid="formula-error">{triggeringError}</p>
              )}

              {/* Consequences */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Consequences</label>
                  <Button size="sm" variant="ghost" onClick={addConsequence} data-testid="add-consequence">
                    + Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {consequences.map((c) => (
                    <div key={c.id} className="p-2 bg-[var(--color-background)] rounded border border-[var(--color-border)]" data-testid="consequence-row">
                      <div className="flex gap-2 mb-1">
                        <select
                          value={c.parameterId}
                          onChange={(e) => updateConsequence(c.id, { parameterId: e.target.value })}
                          className="flex-1 h-7 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)]"
                          data-testid="consequence-param"
                        >
                          <option value="">Parameter...</option>
                          {targetComponent?.parameters.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeConsequence(c.id)}
                          className="text-[var(--color-accent-red)] hover:text-red-400 text-xs cursor-pointer"
                          data-testid="remove-consequence"
                        >
                          Remove
                        </button>
                      </div>
                      <Input
                        value={c.formula}
                        onChange={(e) => updateConsequence(c.id, { formula: e.target.value })}
                        placeholder="e.g. Dam.integrity - 30"
                        className="mb-1 text-xs h-7"
                        data-testid="consequence-formula"
                      />
                      <div className="flex gap-1">
                        {(['impulse', 'duration', 'persistent'] as DurationType[]).map((dt) => (
                          <Button
                            key={dt}
                            size="sm"
                            variant={c.durationType === dt ? 'default' : 'secondary'}
                            onClick={() => updateConsequence(c.id, { durationType: dt })}
                            className="text-[10px] h-6 px-2"
                            data-testid={`duration-${dt}`}
                          >
                            {dt === 'duration' ? 'Duration-based' : dt.charAt(0).toUpperCase() + dt.slice(1)}
                          </Button>
                        ))}
                      </div>
                      {c.durationType === 'duration' && (
                        <div className="mt-1">
                          <Input
                            type="number"
                            value={c.duration ?? ''}
                            onChange={(e) => updateConsequence(c.id, { duration: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="Duration (seconds)"
                            className="text-xs h-7"
                            data-testid="consequence-duration"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <p className="text-[10px] text-[var(--color-accent-red)]" data-testid="chain-save-error">{saveError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-[var(--color-border)]">
            <Button size="sm" variant="secondary" onClick={closeChainBuilder}>Cancel</Button>
            <Button size="sm" onClick={handleSave} data-testid="chain-save">Save Chain</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
