"use client";

/**
 * Horizontal barplots showing record/species/genus/family/order counts per trait.
 * Uses GROUPED (side-by-side) bars per Figure 6 reference, NOT stacked.
 * Colors per PRD: #F8766D=Records, #A3A500=Family, #00BF7D=Genus, #00B0F6=Species, #E76BF3=Order
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
  { key: 'records' as const, label: 'Row', color: '#F8766D' },
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

  // Find global max for scaling (across all categories individually)
  const globalMax = Math.max(
    ...stats.flatMap((s) => SEGMENTS.map((seg) => s[seg.key]))
  );

  return (
    <div data-testid="barplots-container" className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Taxa per trait (grouped bars)
      </h3>

      {stats.map((stat) => (
        <div key={stat.traitName} className="flex items-start gap-2">
          <span className="w-32 text-xs text-muted-foreground text-right shrink-0 truncate pt-0.5">
            {stat.traitName}
          </span>
          <div className="flex-1 space-y-0.5">
            {SEGMENTS.map((seg) => {
              const value = stat[seg.key];
              const widthPct = globalMax > 0 ? (value / globalMax) * 100 : 0;
              return (
                <div key={seg.key} className="flex items-center gap-1 h-3">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${Math.max(widthPct, 0.5)}%`,
                      backgroundColor: seg.color,
                      minWidth: value > 0 ? '2px' : '0px',
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {value > 0 ? formatNumber(value) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
