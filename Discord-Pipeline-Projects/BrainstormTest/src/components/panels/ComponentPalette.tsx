import { Box, Globe } from 'lucide-react'
import type { ComponentType } from '@/types/model'

const paletteItems: { type: ComponentType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    type: 'internal',
    label: 'Internal Component',
    icon: <Box size={16} />,
    color: 'var(--color-primary)',
  },
  {
    type: 'external',
    label: 'External Component',
    icon: <Globe size={16} />,
    color: 'var(--color-accent-orange)',
  },
]

export function ComponentPalette() {
  const onDragStart = (event: React.DragEvent, type: ComponentType) => {
    event.dataTransfer.setData('application/cascadesim-component-type', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="p-3" data-testid="component-palette">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
        Components
      </h3>
      <div className="space-y-1.5">
        {paletteItems.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] cursor-grab active:cursor-grabbing hover:border-[var(--color-text-muted)] transition-colors"
            data-testid={`palette-${item.type}`}
          >
            <span style={{ color: item.color }}>{item.icon}</span>
            <span className="text-sm text-[var(--color-text)]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
