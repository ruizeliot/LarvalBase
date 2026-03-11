"use client";

import { useState, useMemo } from "react";

/**
 * Publication year & origin bar chart.
 * Shows stacked bars per 5-year bin, colored by source category.
 * Matches Figure 2 from the R reference (template_publi_year.R).
 *
 * Data is grouped by VARIABLE × ORIGIN × TYPE × YEAR_BIN.
 * Unique references counted per variable first, then summed for "All dispersal traits".
 */

export interface PublicationDataPoint {
  year: number;
  source: string;
  count: number;
  variable?: string;
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

/** Order sources for consistent stacking */
const SOURCE_ORDER = [
  'Original\nReared', 'Cited\nReared',
  'Original\nWild', 'Cited\nWild',
  'Original\nUnrecorded', 'Cited\nUnrecorded',
];

const ALL_TRAITS_LABEL = 'All dispersal traits';

export function PublicationChart({ data }: PublicationChartProps) {
  const hasVariable = data.length > 0 && data[0].variable != null;

  // Extract unique variables
  const variables = useMemo(() => {
    if (!hasVariable) return [];
    const vars = new Set<string>();
    for (const d of data) {
      if (d.variable) vars.add(d.variable);
    }
    return Array.from(vars).sort();
  }, [data, hasVariable]);

  const [selectedVariable, setSelectedVariable] = useState(ALL_TRAITS_LABEL);

  // Compute chart data based on selected variable
  const chartData = useMemo(() => {
    if (data.length === 0) return { byYear: new Map<number, Map<string, number>>(), allSources: new Set<string>() };

    const byYear = new Map<number, Map<string, number>>();
    const allSources = new Set<string>();

    if (!hasVariable || selectedVariable === ALL_TRAITS_LABEL) {
      // Aggregate: sum per-variable counts across variables per (source, yearBin)
      // This matches the R "All dispersal traits" logic
      for (const d of data) {
        allSources.add(d.source);
        if (!byYear.has(d.year)) byYear.set(d.year, new Map());
        const yearMap = byYear.get(d.year)!;
        yearMap.set(d.source, (yearMap.get(d.source) ?? 0) + d.count);
      }
    } else {
      // Filter to selected variable only
      for (const d of data) {
        if (d.variable !== selectedVariable) continue;
        allSources.add(d.source);
        if (!byYear.has(d.year)) byYear.set(d.year, new Map());
        const yearMap = byYear.get(d.year)!;
        yearMap.set(d.source, (yearMap.get(d.source) ?? 0) + d.count);
      }
    }

    return { byYear, allSources };
  }, [data, hasVariable, selectedVariable]);

  if (data.length === 0) return null;

  const { byYear, allSources } = chartData;
  // Build complete sequence of 5-year bins between min and max so empty bins are shown
  const rawYears = Array.from(byYear.keys()).sort((a, b) => a - b);
  const years: number[] = [];
  if (rawYears.length > 0) {
    for (let y = rawYears[0]; y <= rawYears[rawYears.length - 1]; y += 5) {
      years.push(y);
      if (!byYear.has(y)) byYear.set(y, new Map());
    }
  }
  const maxCount = Math.max(
    0,
    ...years.map((y) => {
      let total = 0;
      for (const count of byYear.get(y)!.values()) total += count;
      return total;
    })
  );

  const orderedSources = SOURCE_ORDER.filter((s) => allSources.has(s));

  return (
    <div data-testid="pub-chart" className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">
          Number of references per 5-year interval
        </h3>
        {hasVariable && variables.length > 0 && (
          <select
            data-testid="pub-chart-variable-select"
            value={selectedVariable}
            onChange={(e) => setSelectedVariable(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-background text-foreground max-w-[200px] truncate"
          >
            <option value={ALL_TRAITS_LABEL}>{ALL_TRAITS_LABEL}</option>
            {variables.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stacked bars by 5-year bins */}
      <div className="flex gap-[2px] h-40 pt-2">
        {years.map((year) => {
          const yearData = byYear.get(year)!;
          let total = 0;
          for (const count of yearData.values()) total += count;
          const heightPct = maxCount > 0 ? (total / maxCount) * 100 : 0;

          return (
            <div key={year} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                data-testid="pub-chart-bar"
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
                      data-testid="pub-chart-bar-segment"
                      style={{
                        height: `${segPct}%`,
                        backgroundColor: getSourceColor(source),
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">
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
