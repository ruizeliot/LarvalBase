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
  imageStats?: TraitBarplotStat | null;
}

const SEGMENTS = [
  { key: 'records' as const, label: 'Row', color: '#F8766D' },
  { key: 'species' as const, label: 'Species', color: '#00B0F6' },
  { key: 'genus' as const, label: 'Genus', color: '#00BF7D' },
  { key: 'family' as const, label: 'Family', color: '#A3A500' },
  { key: 'order' as const, label: 'Order', color: '#E76BF3' },
];

/**
 * Map trait display names to their SVG icon paths (relative to /icons/).
 * Most icons are in /icons/sections/, but some (Swimming speed, Vertical position, Images)
 * are directly in /icons/.
 */
const TRAIT_ICON_MAP: Record<string, string> = {
  'Age-at-length data': '/icons/sections/Age-at-Length.svg',
  'Egg traits': '/icons/sections/Egg %26 Incubation.svg',
  'Incubation': '/icons/sections/Egg %26 Incubation.svg',
  'First feeding size': '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  'Hatching size': '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  'First feeding age': '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  'Flexion size': '/icons/sections/Flexion Stage.svg',
  'Flexion age': '/icons/sections/Flexion Stage.svg',
  'Metamorphosis size': '/icons/sections/Metamorphosis.svg',
  'Metamorphosis age': '/icons/sections/Metamorphosis.svg',
  'Settlement size': '/icons/sections/Settlement.svg',
  'Settlement age': '/icons/sections/Settlement.svg',
  'Pelagic juvenile': '/icons/sections/Pelagic Juvenile.svg',
  'Rafting': '/icons/sections/Rafting.svg',
  'In situ swimming': '/icons/Swimming speed.svg',
  'Critical swimming': '/icons/Swimming speed.svg',
  'Vertical position': '/icons/Vertical position.svg',
  'Colored pictures': '/icons/Images.svg',
};

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function TraitBarplots({ stats, imageStats }: TraitBarplotsProps) {
  if (stats.length === 0) return null;

  // Combine stats with optional image stats, sorted by record count descending
  const allStats = imageStats ? [...stats, imageStats].sort((a, b) => b.records - a.records) : stats;

  // Find global max for scaling (across all categories individually)
  const globalMax = Math.max(
    ...allStats.flatMap((s) => SEGMENTS.map((seg) => s[seg.key]))
  );

  return (
    <div data-testid="barplots-container" className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Taxa per trait (grouped bars)
      </h3>

      {allStats.map((stat) => {
        const iconFile = TRAIT_ICON_MAP[stat.traitName];
        return (
        <div key={stat.traitName} className="flex items-start gap-2">
          <div className="w-48 flex flex-col items-end shrink-0 pt-0.5">
            <span className="text-xs text-muted-foreground text-right truncate w-full">
              {stat.traitName}
            </span>
            {iconFile && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={iconFile}
                alt=""
                width={48}
                height={48}
                className="shrink-0 mt-0.5"
                style={{ opacity: 0.85, filter: 'brightness(0) invert(1)' }}
              />
            )}
          </div>
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
