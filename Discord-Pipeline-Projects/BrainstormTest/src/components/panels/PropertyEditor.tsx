import { useState } from 'react'
import { useModelStore } from '@/store/modelStore'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

interface PropertyEditorProps {
  componentId: string
}

function getParamError(
  paramName: string,
  paramValue: number,
  paramId: string,
  allParams: { id: string; name: string; value: number }[]
): string | null {
  if (!paramName || paramName.trim() === '') return 'Name is required'
  const dups = allParams.filter((p) => p.id !== paramId && p.name === paramName)
  if (dups.length > 0) return 'Duplicate parameter name'
  if (isNaN(paramValue)) return 'Value must be numeric'
  return null
}

function getCapError(
  capName: string,
  capMin: number,
  capMax: number,
  capId: string,
  allCaps: { id: string; name: string; min: number; max: number }[]
): string | null {
  if (!capName || capName.trim() === '') return 'Name is required'
  const dups = allCaps.filter((c) => c.id !== capId && c.name === capName)
  if (dups.length > 0) return 'Duplicate capacity name'
  if (isNaN(capMin) || isNaN(capMax)) return 'Values must be numeric'
  if (capMin > capMax) return 'Min must be ≤ max'
  return null
}

export function PropertyEditor({ componentId }: PropertyEditorProps) {
  const component = useModelStore((s) => s.components[componentId])
  const chains = useModelStore((s) => s.chains)
  const updateComponent = useModelStore((s) => s.updateComponent)
  const addParameter = useModelStore((s) => s.addParameter)
  const updateParameter = useModelStore((s) => s.updateParameter)
  const removeParameter = useModelStore((s) => s.removeParameter)
  const addCapacity = useModelStore((s) => s.addCapacity)
  const updateCapacity = useModelStore((s) => s.updateCapacity)
  const removeCapacity = useModelStore((s) => s.removeCapacity)
  const removeComponent = useModelStore((s) => s.removeComponent)
  const selectNode = useUiStore((s) => s.selectNode)

  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'type-change' | 'delete'
    message: string
    details: string[]
    onConfirm: () => void
  } | null>(null)

  if (!component) return null

  const isInternal = component.type === 'internal'

  const handleTypeToggle = (newType: 'internal' | 'external') => {
    if (newType === component.type) return

    // If switching to external and capacities exist, show confirmation
    if (newType === 'external' && component.capacities.length > 0) {
      setConfirmDialog({
        type: 'type-change',
        message: 'Switching to External will remove all capacities.',
        details: component.capacities.map((c) => c.name),
        onConfirm: () => {
          updateComponent(componentId, { type: 'external' })
          setConfirmDialog(null)
        },
      })
      return
    }

    updateComponent(componentId, { type: newType })
  }

  const handleDelete = () => {
    // Check if component has associated chains
    const affectedChains = Object.values(chains).filter(
      (chain) => chain.sourceId === componentId || chain.targetId === componentId
    )

    if (affectedChains.length > 0) {
      setConfirmDialog({
        type: 'delete',
        message: 'This component is referenced by causal chains. Deleting it will also remove these chains:',
        details: affectedChains.map((c) => c.name),
        onConfirm: () => {
          removeComponent(componentId)
          selectNode(null)
          setConfirmDialog(null)
        },
      })
      return
    }

    removeComponent(componentId)
    selectNode(null)
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Properties
      </h3>

      {/* Name */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Name</label>
        <Input
          value={component.name}
          onChange={(e) => updateComponent(componentId, { name: e.target.value })}
          data-testid="property-name"
        />
      </div>

      {/* Type toggle */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Type</label>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={isInternal ? 'default' : 'secondary'}
            onClick={() => handleTypeToggle('internal')}
            data-testid="type-internal"
          >
            Internal
          </Button>
          <Button
            size="sm"
            variant={!isInternal ? 'default' : 'secondary'}
            onClick={() => handleTypeToggle('external')}
            data-testid="type-external"
          >
            External
          </Button>
        </div>
      </div>

      {/* Parameters */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[var(--color-text-muted)]">Parameters</label>
          <Button size="sm" variant="ghost" onClick={() => addParameter(componentId)} data-testid="add-parameter">
            <Plus size={12} />
          </Button>
        </div>
        <div className="space-y-1">
          {component.parameters.map((param) => {
            const error = getParamError(param.name, param.value, param.id, component.parameters)
            return (
              <div key={param.id}>
                <div className="flex gap-1 items-center" data-testid="param-row">
                  <Input
                    value={param.name}
                    onChange={(e) => updateParameter(componentId, param.id, { name: e.target.value })}
                    className="flex-1"
                    placeholder="name"
                  />
                  <Input
                    type="number"
                    value={isNaN(param.value) ? '' : param.value}
                    onChange={(e) => {
                      const num = e.target.value === '' ? NaN : Number(e.target.value)
                      updateParameter(componentId, param.id, { value: num })
                    }}
                    className="w-16"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeParameter(componentId, param.id)}
                    className="h-7 w-7 flex-shrink-0"
                    data-testid="remove-parameter"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
                {error && (
                  <p className="text-[10px] text-[var(--color-accent-red)] mt-0.5 ml-1" data-testid="param-error">
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Capacities (internal only) */}
      {isInternal && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[var(--color-text-muted)]">Capacities</label>
            <Button size="sm" variant="ghost" onClick={() => addCapacity(componentId)} data-testid="add-capacity">
              <Plus size={12} />
            </Button>
          </div>
          <div className="space-y-1">
            {component.capacities.map((cap) => {
              const error = getCapError(cap.name, cap.min, cap.max, cap.id, component.capacities)
              return (
                <div key={cap.id}>
                  <div className="flex gap-1 items-center" data-testid="capacity-row">
                    <Input
                      value={cap.name}
                      onChange={(e) => updateCapacity(componentId, cap.id, { name: e.target.value })}
                      className="flex-1"
                      placeholder="name"
                    />
                    <Input
                      type="number"
                      value={cap.min}
                      onChange={(e) =>
                        updateCapacity(componentId, cap.id, { min: Number(e.target.value) })
                      }
                      className="w-14"
                      placeholder="min"
                    />
                    <Input
                      type="number"
                      value={cap.max}
                      onChange={(e) =>
                        updateCapacity(componentId, cap.id, { max: Number(e.target.value) })
                      }
                      className="w-14"
                      placeholder="max"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCapacity(componentId, cap.id)}
                      className="h-7 w-7 flex-shrink-0"
                      data-testid="remove-capacity"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  {error && (
                    <p className="text-[10px] text-[var(--color-accent-red)] mt-0.5 ml-1" data-testid="capacity-error">
                      {error}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delete component */}
      <div className="pt-2 border-t border-[var(--color-border)]">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDelete}
          data-testid="delete-component"
        >
          <Trash2 size={12} />
          Delete Component
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="confirm-dialog"
        >
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 max-w-sm shadow-xl">
            <p className="text-sm text-[var(--color-text)] mb-2">{confirmDialog.message}</p>
            {confirmDialog.details.length > 0 && (
              <ul className="text-xs text-[var(--color-text-muted)] mb-3 list-disc list-inside">
                {confirmDialog.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmDialog(null)}
                data-testid="confirm-cancel"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDialog.onConfirm}
                data-testid="confirm-ok"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
