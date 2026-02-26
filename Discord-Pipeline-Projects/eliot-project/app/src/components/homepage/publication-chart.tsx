"use client";

/**
 * Publication year & origin bar chart.
 * Shows stacked bars per 5-year bin, colored by source category.
 * Matches Figure 2 from the R reference (template_publi_year.R).
 */

export interface PublicationDataPoint {
  year: number;
  source: string;
  count: number;
}

interface PublicationChartProps {
  data: PublicationDataPoint[];
}

/**
 * Color palette matching the R Figure 2 colors.
 * 6 categories: Original/Cited × Reared/Wild/Unrecorded
 */
const SOURCE_COLORS: Record<string, string> = {
  'Original\nReared': '#1f78b4',
  'Cited\nReared': '#a6cee3',
  'Original\nWild': '#33a02c',
  'Cited\nWild': '#b2df8a',
  'Original\nUnrecorded': '#e31a1c',
  'Cited\nUnrecorded': '#fb9a99',
};

/** Fallback for any unmatched source */
function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#94a3b8';
}

/** Format source label for legend (replace newline) */
function formatSourceLabel(source: string): string {
  return source.replace('\n', ' - ');
}

export function PublicationChart({ data }: PublicationChartProps) {
  if (data.length === 0) return null;

  // Group by year (5-year bin)
  const byYear = new Map<number, Map<string, number>>();
  const allSources = new Set<string>();

  for (const d of data) {
    allSources.add(d.source);
    if (!byYear.has(d.year)) byYear.set(d.year, new Map());
    const yearMap = byYear.get(d.year)!;
    yearMap.set(d.source, (yearMap.get(d.source) ?? 0) + d.count);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  const maxCount = Math.max(
    ...years.map((y) => {
      let total = 0;
      for (const count of byYear.get(y)!.values()) total += count;
      return total;
    })
  );

  // Order sources for consistent stacking
  const sourceOrder = [
    'Original\nReared', 'Cited\nReared',
    'Original\nWild', 'Cited\nWild',
    'Original\nUnrecorded', 'Cited\nUnrecorded',
  ];
  const orderedSources = sourceOrder.filter((s) => allSources.has(s));

  return (
    <div data-testid="pub-chart" className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Number of references per 5-year interval
      </h3>

      {/* Stacked bars by 5-year bins */}
      <div className="flex items-end gap-[2px] h-40 pt-2">
        {years.map((year) => {
          const yearData = byYear.get(year)!;
          let total = 0;
          for (const count of yearData.values()) total += count;
          const heightPct = maxCount > 0 ? (total / maxCount) * 100 : 0;

          return (
            <div key={year} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                style={{ height: `${heightPct}%`, minHeight: total > 0 ? '2px' : '0px' }}
              >
                {orderedSources.map((source) => {
                  const count = yearData.get(source) ?? 0;
                  if (count === 0) return null;
                  const segPct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={source}
                      style={{
                        height: `${segPct}%`,
                        backgroundColor: getSourceColor(source),
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-[8px] text-muted-foreground mt-1">
                {year}
              </span>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-popover border rounded px-2 py-1 text-[10px] text-popover-foreground whitespace-nowrap z-10 shadow-md">
                {year}–{year + 4}: {total} refs
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mt-2">
        {orderedSources.map((source) => (
          <div key={source} className="flex items-center gap-1 text-xs text-muted-foreground">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: getSourceColor(source) }}
            />
            {formatSourceLabel(source)}
          </div>
        ))}
      </div>
    </div>
  );
}
