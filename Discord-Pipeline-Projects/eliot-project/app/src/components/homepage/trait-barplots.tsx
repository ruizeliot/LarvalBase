"use client";

/**
 * Horizontal barplots showing record/species/genus/family/order counts per trait.
 * Colors per PRD: #F8766D=Records, #A3A500=Family, #00BF7D=Genus, #00B0F6=Species, #E76BF3=Order
 * Flat colors only — NO gradients. 2px white delineation between segments.
 */

export interface TraitBarplotStat {
  traitName: string;
  records: number;
  species: number;
  genus: number;
  family: number;
  order: number;
}

interface TraitBarplotsProps {
  stats: TraitBarplotStat[];
}

const SEGMENTS = [
  { key: 'records' as const, label: 'Records', color: '#F8766D' },
  { key: 'species' as const, label: 'Species', color: '#00B0F6' },
  { key: 'genus' as const, label: 'Genus', color: '#00BF7D' },
  { key: 'family' as const, label: 'Family', color: '#A3A500' },
  { key: 'order' as const, label: 'Order', color: '#E76BF3' },
];

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function TraitBarplots({ stats }: TraitBarplotsProps) {
  if (stats.length === 0) return null;

  // Find max total for scaling
  const maxTotal = Math.max(
    ...stats.map((s) => s.records + s.species + s.genus + s.family + s.order)
  );

  return (
    <div data-testid="barplots-container" className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Records / Species / Genus / Family / Order counts per trait
      </h3>

      {stats.map((stat) => {
        const total = stat.records + stat.species + stat.genus + stat.family + stat.order;
        const scale = maxTotal > 0 ? total / maxTotal : 0;

        return (
          <div key={stat.traitName} className="flex items-center gap-2">
            <span className="w-28 text-xs text-muted-foreground text-right shrink-0 truncate">
              {stat.traitName}
            </span>
            <div
              className="flex-1 flex h-6 rounded overflow-hidden"
              style={{ width: `${scale * 100}%` }}
            >
              {SEGMENTS.map((seg) => {
                const value = stat[seg.key];
                const pct = total > 0 ? (value / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={seg.key}
                    className="h-full flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: seg.color,
                      borderRight: '2px solid white',
                    }}
                  >
                    {pct > 8 ? formatNumber(value) : ''}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mt-2">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1 text-xs text-muted-foreground">
            <div
              data-testid="legend-dot"
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}
