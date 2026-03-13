'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, XAxis, YAxis, Cell, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import type { FamilyBarChartEntry } from '@/lib/types/species.types';
import { useI18n } from '@/lib/i18n/i18n-context';

interface FamilyBarChartProps {
  /** Per-species mean data for the family/genus */
  data: FamilyBarChartEntry[];
  /** Current species ID (to highlight) */
  currentSpeciesId: string;
  /** Unit of measurement for tooltip */
  unit: string;
  /** Trait label for tooltip */
  traitLabel: string;
  /** Comparison type: 'family', 'genus', or 'order' */
  comparisonType?: 'family' | 'genus' | 'order';
  /** Taxonomy name (family or genus name) */
  taxonomyName?: string;
}

/**
 * Format species name to two lines.
 * "Genus species" -> "Genus\nspecies"
 */
function formatSpeciesNameTwoLines(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]}\n${parts.slice(1).join(' ')}`;
  }
  return name;
}

/**
 * Custom Y-axis tick for multi-line species names.
 * Both genus and species epithet are italic.
 * Reduced spacing between genus and species lines.
 * Shows n_sp with "sp" as subscript when present.
 */
function CustomYAxisTick(props: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  fontFamily: string;
}) {
  const { x = 0, y = 0, payload, fontFamily } = props;
  if (!payload?.value) return null;

  const lines = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => {
        // Check for n_sp pattern and render "sp" as subscript
        const nSpMatch = line.match(/^n_sp\s*=\s*(.+)$/);
        if (nSpMatch) {
          return (
            <text
              key={i}
              x={0}
              y={0}
              dy={i === 0 ? -4 : 8}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
              style={{ fontFamily, fontSize: 13 }}
            >
              n<tspan baselineShift="sub" style={{ fontSize: 9 }}>sp</tspan> = {nSpMatch[1]}
            </text>
          );
        }
        return (
          <text
            key={i}
            x={0}
            y={0}
            dy={i === 0 ? -4 : 8}
            textAnchor="end"
            fill="hsl(var(--foreground))"
            style={{ fontFamily, fontStyle: 'italic', fontSize: 13 }}
          >
            {line}
          </text>
        );
      })}
    </g>
  );
}

/**
 * Horizontal bar chart showing family/genus comparison for a trait.
 * Current species highlighted in green.
 * Genus comparison uses red bars, Family uses blue bars.
 */
export function FamilyBarChart({
  data,
  currentSpeciesId,
  unit,
  traitLabel,
  comparisonType = 'family',
  taxonomyName,
}: FamilyBarChartProps) {
  // Sort by decreasing mean value (highest at top)
  const sortedData = [...data].sort((a, b) => b.meanValue - a.meanValue);

  // For depth traits (all negative values), domain = [dataMin, 0] so 0 is on the right
  const allNegative = sortedData.length > 0 && sortedData.every(d => d.meanValue < 0);
  const xDomain: [number | string, number | string] = allNegative
    ? ['dataMin', 0]
    : [0, 'dataMax'];

  // Prepare chart data with two-line display names
  const chartData = sortedData.map((d) => ({
    ...d,
    displayName: formatSpeciesNameTwoLines(d.speciesName),
  }));

  // Dynamic height based on number of species (min 150px, ~40px per bar for two lines with larger text)
  const chartHeight = Math.max(150, chartData.length * 40);

  // Font family with Segoe UI and fallbacks
  const fontFamily = 'Segoe UI Semilight, Segoe UI, -apple-system, sans-serif';

  // Colors as specified:
  // - Focal bar (current species): #7CAE00 (green)
  // - ORDER comparison: #C77CFF (purple)
  // - FAMILY comparison: #F8766D (coral red)
  // - GENUS comparison: #619CFF (blue)
  const { t } = useI18n();
  const currentSpeciesColor = '#7CAE00';
  const otherSpeciesColor = comparisonType === 'genus' ? '#619CFF' : comparisonType === 'order' ? '#C77CFF' : '#F8766D';

  // Detect mobile on mount for responsive YAxis width (useEffect avoids SSR hydration mismatch)
  const [yAxisWidth, setYAxisWidth] = useState(150);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) setYAxisWidth(80);
  }, []);

  return (
    <div className="space-y-2 w-full" data-chart="comparison" style={{ minWidth: 0 }}>
      {/* Chart title */}
      <div className="text-sm font-medium text-center uppercase tracking-wide"
           style={{ color: otherSpeciesColor }}>
        {comparisonType === 'genus' ? t('genus_comparison') : comparisonType === 'order' ? t('order_comparison') : t('family_comparison')}
        {taxonomyName && <span className="font-normal ml-1">({taxonomyName})</span>}
      </div>

      <div style={{ width: '100%', height: `${chartHeight}px`, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: yAxisWidth < 150 ? 0 : 10, bottom: 5 }}
        >
          <CartesianGrid
            horizontal={false}
            vertical={true}
            stroke="#cccccc"
            strokeDasharray="3 3"
            style={{ stroke: '#cccccc' }}
          />
          <XAxis
            type="number"
            domain={xDomain}
            tickLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            tickSize={6}
            axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            tick={{
              fontFamily,
              fontSize: 10,
              fill: 'hsl(var(--muted-foreground))',
            }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tickLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            tickSize={6}
            axisLine={false}
            width={yAxisWidth}
            interval={0}
            tick={(props) => (
              <CustomYAxisTick {...props} fontFamily={fontFamily} />
            )}
          />
          <Tooltip
            cursor={{ fill: 'rgba(128,128,128,0.15)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0].payload as FamilyBarChartEntry & { displayName: string };
              return (
                <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                  <div className="font-medium italic">{entry.speciesName}</div>
                  <div className="text-muted-foreground">{Number(entry.meanValue).toFixed(2)} {unit}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="meanValue" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.speciesId === currentSpeciesId
                    ? currentSpeciesColor // Green for current species
                    : otherSpeciesColor // Red (genus) or Blue (family)
                }
              />
            ))}
          </Bar>
        </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
