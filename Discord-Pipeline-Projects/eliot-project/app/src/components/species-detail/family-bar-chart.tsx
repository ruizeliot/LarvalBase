'use client';

import { Bar, BarChart, XAxis, YAxis, Cell, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { FamilyBarChartEntry } from '@/lib/types/species.types';

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

const chartConfig = {
  meanValue: {
    label: 'Mean',
  },
} satisfies ChartConfig;

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
  // - GENUS comparison: #00BFC4 (teal)
  const currentSpeciesColor = '#7CAE00';
  const otherSpeciesColor = comparisonType === 'genus' ? '#00BFC4' : comparisonType === 'order' ? '#C77CFF' : '#F8766D';

  return (
    <div className="space-y-2">
      {/* Chart title */}
      <div className="text-sm font-medium text-center uppercase tracking-wide"
           style={{ color: otherSpeciesColor }}>
        {comparisonType === 'genus' ? 'Genus Comparison' : comparisonType === 'order' ? 'Order Comparison' : 'Family Comparison'}
        {taxonomyName && <span className="font-normal ml-1">({taxonomyName})</span>}
      </div>
      
      <ChartContainer
        config={chartConfig}
        className="w-full bg-transparent"
        style={{ minHeight: `${chartHeight}px` }}
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
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
            width={150}
            interval={0}
            tick={(props) => (
              <CustomYAxisTick {...props} fontFamily={fontFamily} />
            )}
          />
          <ChartTooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            content={
              <ChartTooltipContent
                labelFormatter={(value, payload) => {
                  const entry = payload?.[0]?.payload as
                    | (FamilyBarChartEntry & { displayName: string })
                    | undefined;
                  return entry?.speciesName ?? value;
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(2)} ${unit}`,
                  "", // Hide the trait label in tooltip
                ]}
              />
            }
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
      </ChartContainer>
    </div>
  );
}
