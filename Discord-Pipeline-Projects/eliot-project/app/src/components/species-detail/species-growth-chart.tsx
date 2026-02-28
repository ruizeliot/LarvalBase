"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrowthData } from "@/hooks/use-growth-data";
import type { GrowthCurve, RawGrowthPoint, LineStyleType } from "@/lib/types/growth.types";
import { parseXRange, temperatureToSpectralColor } from "@/lib/types/growth.types";

interface SpeciesGrowthChartProps {
  speciesId: string;
  speciesName: string;
}

/**
 * Map line style to SVG stroke-dasharray.
 */
function getStrokeDasharray(lineStyle: LineStyleType): string {
  switch (lineStyle) {
    case "solid":
      return "0";
    case "dashed":
      return "8 4";
    case "dotted":
      return "2 2";
    case "dash-dot":
      return "8 4 2 4";
    default:
      return "0";
  }
}

/**
 * Format temperature string.
 */
function formatTemperature(curve: GrowthCurve): string {
  const { model } = curve;
  if (model.tempMean !== null) {
    if (model.tempMin !== null && model.tempMax !== null) {
      return `${model.tempMean.toFixed(1)}°C (${model.tempMin.toFixed(1)}-${model.tempMax.toFixed(1)})`;
    }
    return `${model.tempMean.toFixed(1)}°C`;
  }
  return "T° unknown";
}

/**
 * Format reference for legend/tooltip.
 */
function formatReference(curve: GrowthCurve): string {
  const { model } = curve;
  const ref = model.reference || "Unknown";
  if (ref.length > 35) {
    return ref.substring(0, 32) + "...";
  }
  return ref;
}

/**
 * Custom tooltip for growth chart.
 * Shows "Age: {value}" header and "Size: {value}" for each entry.
 */
export function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; dataKey: string; payload: Record<string, unknown> }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <p className="font-medium text-sm mb-2">Age: {typeof label === 'number' ? label.toFixed(2) : label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs mb-1">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground truncate">{entry.name}</span>
          <span className="font-medium">Size: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Format age-at-length range from xRange string.
 */
function formatAgeAtLength(model: GrowthCurve['model']): string | null {
  const range = parseXRange(model.xRange);
  if (!range) return null;
  const unit = model.xUnit === 'hph' ? 'hph' : 'dph';
  return `Age-at-length: ${range.min} – ${range.max} ${unit}`;
}

/**
 * Legend item with temperature info, equation, and age-at-length range.
 */
export function GrowthLegendItem({ curve }: { curve: GrowthCurve }) {
  const { model, color, lineStyle } = curve;
  const dashArray = getStrokeDasharray(lineStyle);
  const temp = formatTemperature(curve);
  const ageRange = formatAgeAtLength(model);

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <svg width="24" height="12" className="flex-shrink-0 mt-1">
        <line
          x1="0"
          y1="6"
          x2="24"
          y2="6"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashArray === "0" ? undefined : dashArray}
        />
      </svg>
      <div className="min-w-0">
        <span className="text-foreground block" title={model.reference || ""}>
          {model.reference || "Unknown"}
        </span>
        {model.equation && (
          <span data-testid="legend-equation" className="font-mono text-muted-foreground text-[11px] block">
            {model.equation}
          </span>
        )}
        <span className="text-muted-foreground text-[10px]">
          {temp}{ageRange ? ` · ${ageRange}` : ''}
        </span>
      </div>
    </div>
  );
}

/**
 * Merge all curve points into chart data format.
 */
function buildChartData(
  curves: GrowthCurve[],
  rawPoints: RawGrowthPoint[]
): Array<Record<string, number | undefined>> {
  // Collect all unique X values from curves
  const xValues = new Set<number>();
  curves.forEach((curve) => {
    curve.points.forEach((p) => xValues.add(p.x));
  });
  
  // Add raw points X values
  rawPoints.forEach((p) => xValues.add(p.age));

  // Sort X values
  const sortedX = Array.from(xValues).sort((a, b) => a - b);

  // Build data points
  return sortedX.map((x) => {
    const point: Record<string, number | undefined> = { x };
    
    // Add curve values
    curves.forEach((curve) => {
      const matchingPoint = curve.points.find((p) => Math.abs(p.x - x) < 0.01);
      if (matchingPoint) {
        point[curve.id] = matchingPoint.y;
      }
    });

    // Add raw point if exists at this X
    const rawPoint = rawPoints.find((p) => Math.abs(p.age - x) < 0.01);
    if (rawPoint) {
      point.rawLength = rawPoint.length;
    }

    return point;
  });
}

/**
 * Build separate scatter data for raw points.
 */
function buildScatterData(rawPoints: RawGrowthPoint[]): Array<{ x: number; y: number; temp: number | null; ref: string | null }> {
  return rawPoints.map((p) => ({
    x: p.age,
    y: p.length,
    temp: p.tempMean,
    ref: p.reference,
  }));
}

/**
 * A group of raw data points belonging to the same reference.
 */
export interface RawPointGroup {
  reference: string;
  points: RawGrowthPoint[];
  color: string;
  hasModel: boolean;
  avgTemp: number | null;
}

/**
 * Group raw points by reference. Assign Spectral color based on average temperature.
 * Mark whether the reference has a fitted model curve.
 */
export function groupRawPointsByReference(
  rawPoints: RawGrowthPoint[],
  curves: GrowthCurve[]
): RawPointGroup[] {
  const curveRefs = new Set(curves.map(c => c.model.reference).filter(Boolean));
  const groups = new Map<string, RawGrowthPoint[]>();

  for (const p of rawPoints) {
    const ref = p.reference || 'Unknown';
    const existing = groups.get(ref) || [];
    existing.push(p);
    groups.set(ref, existing);
  }

  return Array.from(groups.entries()).map(([reference, points]) => {
    // Compute average temperature for color
    const temps = points.map(p => p.tempMean).filter((t): t is number => t !== null);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const color = temperatureToSpectralColor(avgTemp);
    const hasModel = curveRefs.has(reference);

    return { reference, points, color, hasModel, avgTemp };
  });
}

/**
 * Species growth chart component.
 * Displays growth curves with colors and raw data points as scatter.
 */
export function SpeciesGrowthChart({
  speciesId,
  speciesName,
}: SpeciesGrowthChartProps) {
  const { curves, rawPoints, axisCaps, isLoading, error } = useGrowthData(speciesId);

  // Build chart data from curves
  const chartData = useMemo(() => buildChartData(curves, rawPoints), [curves, rawPoints]);
  const scatterData = useMemo(() => buildScatterData(rawPoints), [rawPoints]);
  const scatterGroups = useMemo(() => groupRawPointsByReference(rawPoints, curves), [rawPoints, curves]);

  // Determine axis labels from first curve or raw points
  const xAxisLabel = useMemo(() => {
    if (curves.length > 0) {
      const unit = curves[0].model.xUnit;
      return unit === "hph" ? "Age (hours post hatch)" : "Age (days post hatch)";
    }
    return "Age (days post hatch)";
  }, [curves]);

  const yAxisLabel = useMemo(() => {
    if (curves.length > 0) {
      const { yType, yUnit } = curves[0].model;
      return `${yType} (${yUnit})`;
    }
    if (rawPoints.length > 0) {
      return `Length (${rawPoints[0].lengthType})`;
    }
    return "Length (mm)";
  }, [curves, rawPoints]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Age-at-Length</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-destructive/10">
        <CardContent className="p-6">
          <p className="text-sm text-destructive">
            Failed to load growth data: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  // No data state - don't render if no curves AND no raw points
  if (curves.length === 0 && rawPoints.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Age-at-Length</CardTitle>
        <p className="text-sm text-muted-foreground">
          {curves.length > 0 && (
            <span>{curves.length} growth model{curves.length > 1 ? "s" : ""}</span>
          )}
          {curves.length > 0 && rawPoints.length > 0 && <span> • </span>}
          {rawPoints.length > 0 && (
            <span>{rawPoints.length} data point{rawPoints.length > 1 ? "s" : ""}</span>
          )}
          <span> for <em>{speciesName}</em></span>
          {axisCaps?.level && (
            <span> · Axis capped at {axisCaps.level}-level max</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="x"
                type="number"
                domain={[0, axisCaps?.xMax ?? 'auto']}
                label={{
                  value: xAxisLabel,
                  position: "bottom",
                  offset: 0,
                  className: "fill-muted-foreground text-xs",
                }}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(0)}
                className="text-muted-foreground"
              />
              <YAxis
                type="number"
                domain={[0, axisCaps?.yMax ?? 'auto']}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  className: "fill-muted-foreground text-xs",
                }}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
                className="text-muted-foreground"
              />
              <Tooltip content={<GrowthTooltip />} />
              
              {/* Raw data points as scatter — grouped by reference, colored by temperature */}
              {scatterGroups.map((group) => (
                <Scatter
                  key={`scatter-${group.reference}`}
                  name={group.reference}
                  data={group.points.map(p => ({ x: p.age, y: p.length }))}
                  fill={group.hasModel ? group.color : "none"}
                  stroke={group.color}
                  strokeWidth={group.hasModel ? 0 : 1.5}
                  shape="circle"
                  legendType="circle"
                />
              ))}

              {/* Growth model curves */}
              {curves.map((curve) => (
                <Line
                  key={curve.id}
                  type="monotone"
                  dataKey={curve.id}
                  name={formatReference(curve)}
                  stroke={curve.color}
                  strokeWidth={2}
                  strokeDasharray={
                    getStrokeDasharray(curve.lineStyle) === "0"
                      ? undefined
                      : getStrokeDasharray(curve.lineStyle)
                  }
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature color scale */}
        <div data-testid="temp-gradient" className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground">18°C</span>
          <div
            className="h-3 flex-1 max-w-[200px] rounded-md"
            style={{
              background: 'linear-gradient(to right, #4575b4, #91bfdb, #fee08b, #fc8d59, #d73027)',
            }}
          />
          <span className="text-[10px] text-muted-foreground">32°C</span>
          <span className="text-[10px] text-muted-foreground ml-1">Spectral color scale by temperature</span>
        </div>

        {/* Legend with temperatures */}
        {curves.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Growth Equations by Reference:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {curves.map((curve) => (
                <GrowthLegendItem key={curve.id} curve={curve} />
              ))}
            </div>
            {scatterGroups.filter(g => !g.hasModel).map((group) => (
              <div key={`legend-scatter-${group.reference}`} className="flex items-start gap-2 text-xs py-1">
                <svg width="24" height="12" className="flex-shrink-0 mt-1">
                  <circle cx="12" cy="6" r="4" fill="none" stroke={group.color} strokeWidth="1.5" />
                </svg>
                <div className="min-w-0">
                  <span className="text-foreground block">{group.reference} — <em>no fitted model</em></span>
                  <span className="text-muted-foreground text-[10px]">
                    {group.avgTemp !== null ? `T = ${group.avgTemp.toFixed(0)}°C · ` : ''}Scatter points only
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
