"use client";

/**
 * Publication year & origin bar chart.
 * Shows data source distribution by publication year.
 */

export interface PublicationDataPoint {
  year: number;
  source: string;
  count: number;
}

interface PublicationChartProps {
  data: PublicationDataPoint[];
}

/** Color palette for data sources */
const SOURCE_COLORS: Record<string, string> = {
  Literature: '#60a5fa',
  FishBase: '#a78bfa',
  'Field studies': '#f59e0b',
  'Ruiz et al.': '#4ade80',
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#94a3b8';
}

export function PublicationChart({ data }: PublicationChartProps) {
  if (data.length === 0) return null;

  // Group by year
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

  return (
    <div data-testid="pub-chart" className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Publications by Year & Data Source
      </h3>

      {/* Stacked bars */}
      <div className="flex items-end gap-1 h-32 pt-2">
        {years.map((year) => {
          const yearData = byYear.get(year)!;
          let total = 0;
          for (const count of yearData.values()) total += count;
          const heightPct = maxCount > 0 ? (total / maxCount) * 100 : 0;

          return (
            <div key={year} className="flex-1 flex flex-col items-center justify-end">
              <div
                className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                style={{ height: `${heightPct}%`, minHeight: '2px' }}
              >
                {Array.from(allSources).map((source) => {
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
              <span className="text-[9px] text-muted-foreground mt-1">
                {year}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mt-2">
        {Array.from(allSources).map((source) => (
          <div key={source} className="flex items-center gap-1 text-xs text-muted-foreground">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: getSourceColor(source) }}
            />
            {source}
          </div>
        ))}
      </div>
    </div>
  );
}
