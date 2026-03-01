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
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrowthData } from "@/hooks/use-growth-data";
import type { GrowthCurve, RawGrowthPoint, PointShapeType } from "@/lib/types/growth.types";
import { parseXRange, temperatureToSpectralColorDynamic, POINT_SHAPES, REFERENCE_LINE_STYLES } from "@/lib/types/growth.types";
import { downloadCSV } from "@/lib/export/csv-utils";

interface SpeciesGrowthChartProps {
  speciesId: string;
  speciesName: string;
}

/**
 * Map reference index to SVG stroke-dasharray.
 */
function getRefDasharray(refIndex: number): string {
  return REFERENCE_LINE_STYLES[refIndex % REFERENCE_LINE_STYLES.length];
}

/**
 * Format temperature string with °C on same line.
 */
function formatTemperature(curve: GrowthCurve): string {
  const { model } = curve;
  if (model.tempMean !== null) {
    if (model.tempMin !== null && model.tempMax !== null) {
      return `${model.tempMean.toFixed(1)}°C (${model.tempMin.toFixed(1)}–${model.tempMax.toFixed(1)})`;
    }
    return `${model.tempMean.toFixed(1)}°C`;
  }
  return "T° unknown";
}

/**
 * Custom tooltip for growth chart.
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
 * Compute axis caps for the weight chart.
 * Uses the same xMax from met/set databases but computes yMax from weight data.
 */
export function computeWeightAxisCaps(
  rawPoints: RawGrowthPoint[],
  weightCurves: GrowthCurve[],
  xMax: number | null,
): { xMax: number | null; yMax: number | null } {
  let yMax = 0;

  // Max from raw weight data
  for (const p of rawPoints) {
    if (p.weight !== null && p.weight > yMax) yMax = p.weight;
  }

  // Max from weight curve points
  for (const curve of weightCurves) {
    for (const pt of curve.points) {
      if (pt.y > yMax) yMax = pt.y;
    }
  }

  return {
    xMax,
    yMax: yMax > 0 ? yMax * 1.05 : null,
  };
}

/**
 * Legend item with equation and °C on the same line.
 * Reference names are clickable hyperlinks when LINK is available.
 */
export function GrowthLegendItem({
  curve,
  refIndex,
  shape,
}: {
  curve: GrowthCurve;
  refIndex: number;
  shape: PointShapeType;
}) {
  const { model, color } = curve;
  const dashArray = getRefDasharray(refIndex);
  const temp = formatTemperature(curve);
  const refName = model.reference || "Unknown";

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <div className="flex flex-col items-center flex-shrink-0 mt-1 gap-0.5">
        <svg width="24" height="12">
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
        <svg width="12" height="12">
          <ShapeSVG shape={shape} cx={6} cy={6} r={4} fill={color} stroke={color} />
        </svg>
      </div>
      <div className="min-w-0">
        {model.link ? (
          <a
            href={model.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 hover:underline block"
            title={refName}
          >
            {refName}
          </a>
        ) : (
          <span className="text-blue-500 block" title={refName}>
            {refName}
          </span>
        )}
        <span className="text-muted-foreground text-[10px]">
          {model.yType ? `${model.yType} · ` : ''}{model.equation ? `${model.equation} · ` : ''}{temp}
        </span>
      </div>
    </div>
  );
}

/**
 * Render an SVG shape element for scatter point shapes.
 */
function ShapeSVG({
  shape,
  cx,
  cy,
  r,
  fill,
  stroke,
}: {
  shape: PointShapeType;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
}) {
  switch (shape) {
    case 'circle':
      return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />;
    case 'square':
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={1} />;
    case 'triangle':
      return (
        <polygon
          points={`${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
        />
      );
    case 'diamond':
      return (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
        />
      );
    case 'star': {
      const inner = r * 0.4;
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI / 2) + (2 * Math.PI * i / 5);
        pts.push(`${cx + r * Math.cos(outerAngle)},${cy - r * Math.sin(outerAngle)}`);
        const innerAngle = outerAngle + Math.PI / 5;
        pts.push(`${cx + inner * Math.cos(innerAngle)},${cy - inner * Math.sin(innerAngle)}`);
      }
      return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1} />;
    }
    case 'cross':
      return (
        <g>
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={stroke} strokeWidth={2} />
          <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={stroke} strokeWidth={2} />
        </g>
      );
    case 'wye':
      return (
        <g>
          <line x1={cx} y1={cy} x2={cx} y2={cy + r} stroke={stroke} strokeWidth={2} />
          <line x1={cx} y1={cy} x2={cx - r * 0.87} y2={cy - r * 0.5} stroke={stroke} strokeWidth={2} />
          <line x1={cx} y1={cy} x2={cx + r * 0.87} y2={cy - r * 0.5} stroke={stroke} strokeWidth={2} />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />;
  }
}

/**
 * Legend item for scatter-only references (no fitted model).
 * Only the reference name is blue/clickable; "no fitted model" is muted.
 */
export function ScatterOnlyLegendItem({
  reference,
  link,
  color,
  shape,
  avgTemp,
  lengthType,
}: {
  reference: string;
  link: string | null;
  color: string;
  shape: PointShapeType;
  avgTemp: number | null;
  lengthType: string | null;
}) {
  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <svg width="24" height="16" className="flex-shrink-0 mt-1">
        <ShapeSVG shape={shape} cx={12} cy={8} r={5} fill="none" stroke={color} />
      </svg>
      <div className="min-w-0">
        <div>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 hover:underline"
              title={reference}
            >
              {reference}
            </a>
          ) : (
            <span className="text-blue-500" title={reference}>
              {reference}
            </span>
          )}
          <span className="text-muted-foreground"> — <em>no fitted model</em></span>
        </div>
        <span className="text-muted-foreground text-[10px]">
          {lengthType ? `${lengthType} · ` : ''}{avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : ''}
        </span>
      </div>
    </div>
  );
}

/**
 * Custom scatter shape renderer for Recharts.
 */
function makeScatterShape(shape: PointShapeType, fillColor: string, hasModel: boolean) {
  return function ScatterShape(props: { cx?: number; cy?: number }) {
    const { cx = 0, cy = 0 } = props;
    const fill = hasModel ? fillColor : 'none';
    return (
      <svg>
        <ShapeSVG shape={shape} cx={cx} cy={cy} r={4} fill={fill} stroke={fillColor} />
      </svg>
    );
  };
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
  shape: PointShapeType;
  link: string | null;
  lengthType: string | null;
}

/**
 * Group raw points by reference. Assign color based on dynamic temp range.
 */
export function groupRawPointsByReference(
  rawPoints: RawGrowthPoint[],
  curves: GrowthCurve[],
  tempMin: number,
  tempMax: number,
): RawPointGroup[] {
  const curveRefs = new Set(curves.map(c => c.model.reference).filter(Boolean));
  const groups = new Map<string, RawGrowthPoint[]>();

  for (const p of rawPoints) {
    const ref = p.reference || 'Unknown';
    const existing = groups.get(ref) || [];
    existing.push(p);
    groups.set(ref, existing);
  }

  // Build a stable reference → index map for shapes
  const allRefs = Array.from(new Set([
    ...curves.map(c => c.model.reference || 'Unknown'),
    ...groups.keys(),
  ]));

  return Array.from(groups.entries()).map(([reference, points]) => {
    const temps = points.map(p => p.tempMean).filter((t): t is number => t !== null);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const color = temperatureToSpectralColorDynamic(avgTemp, tempMin, tempMax);
    const hasModel = curveRefs.has(reference);
    const refIdx = allRefs.indexOf(reference);
    const shape = POINT_SHAPES[refIdx % POINT_SHAPES.length];
    const link = points[0]?.link || null;

    // Get most common lengthType from points
    const ltCounts = new Map<string, number>();
    for (const p of points) {
      if (p.lengthType) {
        ltCounts.set(p.lengthType, (ltCounts.get(p.lengthType) || 0) + 1);
      }
    }
    let lengthType: string | null = null;
    let maxLtCount = 0;
    for (const [lt, count] of ltCounts) {
      if (count > maxLtCount) {
        lengthType = lt;
        maxLtCount = count;
      }
    }

    return { reference, points, color, hasModel, avgTemp, shape, link, lengthType };
  });
}

/**
 * Build a stable reference → index mapping from all sources.
 */
function buildRefIndexMap(curves: GrowthCurve[], rawRefs: string[]): Map<string, number> {
  const allRefs: string[] = [];
  const seen = new Set<string>();
  for (const c of curves) {
    const ref = c.model.reference || 'Unknown';
    if (!seen.has(ref)) {
      allRefs.push(ref);
      seen.add(ref);
    }
  }
  for (const ref of rawRefs) {
    if (!seen.has(ref)) {
      allRefs.push(ref);
      seen.add(ref);
    }
  }
  return new Map(allRefs.map((ref, i) => [ref, i]));
}

/**
 * Merge all curve points into chart data format.
 */
function buildChartData(
  curves: GrowthCurve[],
): Array<Record<string, number | null>> {
  const xValues = new Set<number>();
  curves.forEach((curve) => {
    curve.points.forEach((p) => xValues.add(p.x));
  });

  const sortedX = Array.from(xValues).sort((a, b) => a - b);

  const curveMaps = curves.map((curve) => {
    const map = new Map<number, number>();
    curve.points.forEach((p) => map.set(p.x, p.y));
    return { id: curve.id, map };
  });

  return sortedX.map((x) => {
    const point: Record<string, number | null> = { x };
    curveMaps.forEach(({ id, map }) => {
      point[id] = map.get(x) ?? null;
    });
    return point;
  });
}

/**
 * Single growth chart (length or weight).
 */
function GrowthChartPanel({
  curves,
  scatterGroups,
  xAxisLabel,
  yAxisLabel,
  axisCaps,
  refIndexMap,
  tempMin,
  tempMax,
  title,
}: {
  curves: GrowthCurve[];
  scatterGroups: RawPointGroup[];
  xAxisLabel: string;
  yAxisLabel: string;
  axisCaps: { xMax: number | null; yMax: number | null } | null;
  refIndexMap: Map<string, number>;
  tempMin: number;
  tempMax: number;
  title: string;
}) {
  const chartData = useMemo(() => buildChartData(curves), [curves]);

  // Compute explicit axis domains from all data (curves + scatter) to prevent
  // Recharts from using [0, 0] when chartData is empty (scatter-only case).
  const xDomain = useMemo((): [number, number | 'auto'] => {
    if (axisCaps?.xMax) return [0, axisCaps.xMax];
    let xMax = 0;
    for (const row of chartData) {
      if (typeof row.x === 'number' && row.x > xMax) xMax = row.x;
    }
    for (const g of scatterGroups) {
      for (const p of g.points) {
        if (p.age > xMax) xMax = p.age;
      }
    }
    return xMax > 0 ? [0, xMax * 1.05] : [0, 'auto'];
  }, [chartData, scatterGroups, axisCaps]);

  const yDomain = useMemo((): [number, number | 'auto'] => {
    if (axisCaps?.yMax) return [0, axisCaps.yMax];
    let yMax = 0;
    for (const row of chartData) {
      for (const [key, val] of Object.entries(row)) {
        if (key !== 'x' && typeof val === 'number' && val > yMax) yMax = val;
      }
    }
    for (const g of scatterGroups) {
      for (const p of g.points) {
        if (p.length !== null && p.length > yMax) yMax = p.length;
      }
    }
    return yMax > 0 ? [0, yMax * 1.05] : [0, 'auto'];
  }, [chartData, scatterGroups, axisCaps]);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
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
              domain={xDomain}
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
              domain={yDomain}
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

            {/* Raw data points as scatter — grouped by reference with unique shapes */}
            {scatterGroups.map((group) => {
              const refIdx = refIndexMap.get(group.reference) ?? 0;
              const shape = POINT_SHAPES[refIdx % POINT_SHAPES.length];
              return (
                <Scatter
                  key={`scatter-${group.reference}`}
                  name={group.reference}
                  dataKey="y"
                  data={group.points.filter(p => p.length !== null).map(p => ({ x: p.age, y: p.length! }))}
                  fill={group.hasModel ? group.color : "none"}
                  stroke={group.color}
                  strokeWidth={group.hasModel ? 0 : 1.5}
                  shape={makeScatterShape(shape, group.color, group.hasModel)}
                  legendType="none"
                />
              );
            })}

            {/* Growth model curves — line style by reference */}
            {curves.map((curve) => {
              const ref = curve.model.reference || 'Unknown';
              const refIdx = refIndexMap.get(ref) ?? 0;
              const dash = getRefDasharray(refIdx);
              return (
                <Line
                  key={curve.id}
                  type="monotone"
                  dataKey={curve.id}
                  name={ref.length > 35 ? ref.substring(0, 32) + '...' : ref}
                  stroke={curve.color}
                  strokeWidth={2}
                  strokeDasharray={dash === "0" ? undefined : dash}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Species growth chart component.
 * Displays growth curves with colors, shapes by reference, and optional weight plot.
 */
export function SpeciesGrowthChart({
  speciesId,
  speciesName,
}: SpeciesGrowthChartProps) {
  const { curves, weightCurves, rawPoints, axisCaps, tempRange, rawExport, modelExport, isLoading, error } = useGrowthData(speciesId);

  // Dynamic temp range for this species
  const tempMin = tempRange?.min ?? 18;
  const tempMax = tempRange?.max ?? 32;

  // Re-color length curves using dynamic temp range
  const recoloredCurves = useMemo(() => {
    return curves.map(curve => ({
      ...curve,
      color: curve.model.tempMean !== null
        ? temperatureToSpectralColorDynamic(curve.model.tempMean, tempMin, tempMax)
        : curve.color,
    }));
  }, [curves, tempMin, tempMax]);

  // Re-color weight curves using dynamic temp range
  const recoloredWeightCurves = useMemo(() => {
    return weightCurves.map(curve => ({
      ...curve,
      color: curve.model.tempMean !== null
        ? temperatureToSpectralColorDynamic(curve.model.tempMean, tempMin, tempMax)
        : curve.color,
    }));
  }, [weightCurves, tempMin, tempMax]);

  // All curves combined for ref index mapping and legend
  const allRecoloredCurves = useMemo(
    () => [...recoloredCurves, ...recoloredWeightCurves],
    [recoloredCurves, recoloredWeightCurves]
  );

  // Filter raw points: length-only for length chart
  const lengthRawPoints = useMemo(
    () => rawPoints.filter(p => p.length !== null && p.length !== undefined),
    [rawPoints]
  );

  // Group scatter points with dynamic coloring (for length chart)
  const scatterGroups = useMemo(
    () => groupRawPointsByReference(lengthRawPoints, allRecoloredCurves, tempMin, tempMax),
    [lengthRawPoints, allRecoloredCurves, tempMin, tempMax]
  );

  // Build stable ref → index map from ALL curves + raw refs
  const refIndexMap = useMemo(() => {
    const rawRefs = Array.from(new Set(rawPoints.map(p => p.reference || 'Unknown')));
    return buildRefIndexMap(allRecoloredCurves, rawRefs);
  }, [allRecoloredCurves, rawPoints]);

  // Check if weight data exists (raw points with weight OR weight curves)
  const weightPoints = useMemo(
    () => rawPoints.filter(p => p.weight !== null && p.weight !== undefined),
    [rawPoints]
  );
  const hasWeight = weightPoints.length > 0 || recoloredWeightCurves.length > 0;

  // Sort all curves by temperature for legend (length + weight)
  const sortedCurves = useMemo(() => {
    return [...allRecoloredCurves].sort((a, b) => {
      const ta = a.model.tempMean ?? Infinity;
      const tb = b.model.tempMean ?? Infinity;
      return ta - tb;
    });
  }, [allRecoloredCurves]);

  // Sort scatter groups by temperature for legend
  const sortedScatterGroups = useMemo(() => {
    return [...scatterGroups].sort((a, b) => {
      const ta = a.avgTemp ?? Infinity;
      const tb = b.avgTemp ?? Infinity;
      return ta - tb;
    });
  }, [scatterGroups]);

  // Axis labels
  const xAxisLabel = useMemo(() => {
    const allCurvesList = [...curves, ...weightCurves];
    if (allCurvesList.length > 0) {
      const unit = allCurvesList[0].model.xUnit;
      return unit === "hph" ? "Age (hours post hatch)" : "Age (days post hatch)";
    }
    return "Age (days post hatch)";
  }, [curves, weightCurves]);

  const yAxisLabel = useMemo(() => {
    // Show generic axis label — specific type (SL, TL) goes in legend
    if (curves.length > 0) {
      const { yUnit } = curves[0].model;
      return `Length (${yUnit})`;
    }
    return "Length (mm)";
  }, [curves]);

  // Weight axis label — generic, specific type (DW, WW) goes in legend
  const weightYLabel = useMemo(() => {
    if (recoloredWeightCurves.length > 0) {
      const { yUnit } = recoloredWeightCurves[0].model;
      return `Weight (${yUnit})`;
    }
    return "Weight (mg)";
  }, [recoloredWeightCurves]);

  // Weight axis caps: share xMax from met/set, compute yMax from weight data
  const weightAxisCaps = useMemo(() => {
    if (!hasWeight) return null;
    return computeWeightAxisCaps(weightPoints, recoloredWeightCurves, axisCaps?.xMax ?? null);
  }, [hasWeight, weightPoints, recoloredWeightCurves, axisCaps]);

  // Weight scatter groups — group weight raw points by reference
  const weightScatterGroups: RawPointGroup[] = useMemo(() => {
    if (!hasWeight) return [];
    return groupRawPointsByReference(weightPoints, allRecoloredCurves, tempMin, tempMax)
      .filter(g => g.points.length > 0);
  }, [hasWeight, weightPoints, allRecoloredCurves, tempMin, tempMax]);

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

  // No data state
  if (curves.length === 0 && weightCurves.length === 0 && rawPoints.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Growth Data</CardTitle>
            <p className="text-sm text-muted-foreground">
              {allRecoloredCurves.length > 0 && (
                <span>{allRecoloredCurves.length} growth model{allRecoloredCurves.length > 1 ? "s" : ""}</span>
              )}
              {allRecoloredCurves.length > 0 && rawPoints.length > 0 && <span> • </span>}
              {rawPoints.length > 0 && (
                <span>{rawPoints.length} data point{rawPoints.length > 1 ? "s" : ""}</span>
              )}
              <span> for <em>{speciesName}</em></span>
              {axisCaps?.level && (
                <span> · Axis capped at {axisCaps.level}-level max</span>
              )}
            </p>
          </div>
          {/* Export buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {rawExport.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(rawExport, `${speciesName.replace(/\s+/g, '_')}_age-length-data`)}
              >
                <Download className="h-4 w-4 mr-1" />
                Age-length data
              </Button>
            )}
            {modelExport.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(modelExport, `${speciesName.replace(/\s+/g, '_')}_growth-models`)}
              >
                <Download className="h-4 w-4 mr-1" />
                Growth models
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Charts: side by side if weight data available */}
        <div className={hasWeight ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
          {/* Length chart — only show if there's length data */}
          {(recoloredCurves.length > 0 || lengthRawPoints.length > 0) && (
            <GrowthChartPanel
              curves={recoloredCurves}
              scatterGroups={scatterGroups}
              xAxisLabel={xAxisLabel}
              yAxisLabel={yAxisLabel}
              axisCaps={axisCaps}
              refIndexMap={refIndexMap}
              tempMin={tempMin}
              tempMax={tempMax}
              title="Length"
            />
          )}
          {/* Weight chart — show if weight data or weight curves exist */}
          {hasWeight && (
            <GrowthChartPanel
              curves={recoloredWeightCurves}
              scatterGroups={weightScatterGroups.map(g => ({
                ...g,
                // Override points to use weight as y value
                points: g.points.map(p => ({ ...p, age: p.age, length: p.weight! })),
              }))}
              xAxisLabel={xAxisLabel}
              yAxisLabel={weightYLabel}
              axisCaps={weightAxisCaps}
              refIndexMap={refIndexMap}
              tempMin={tempMin}
              tempMax={tempMax}
              title="Weight"
            />
          )}
        </div>

        {/* Dynamic temperature color scale */}
        <div data-testid="temp-gradient" className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground">{tempMin.toFixed(0)}°C</span>
          <div
            className="h-3 flex-1 max-w-[200px] rounded-md"
            style={{
              background: 'linear-gradient(to right, #4575b4, #91bfdb, #fee08b, #fc8d59, #d73027)',
            }}
          />
          <span className="text-[10px] text-muted-foreground">{tempMax.toFixed(0)}°C</span>
          <span className="text-[10px] text-muted-foreground ml-1">Spectral color scale by temperature</span>
        </div>

        {/* Legend — sorted by temperature, no age-at-length mention */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            References:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {/* Curves with models */}
            {sortedCurves.map((curve) => {
              const ref = curve.model.reference || 'Unknown';
              const refIdx = refIndexMap.get(ref) ?? 0;
              const shape = POINT_SHAPES[refIdx % POINT_SHAPES.length];
              return (
                <GrowthLegendItem
                  key={curve.id}
                  curve={curve}
                  refIndex={refIdx}
                  shape={shape}
                />
              );
            })}
            {/* Scatter-only references */}
            {sortedScatterGroups.filter(g => !g.hasModel).length > 0 && (
              <div className="col-span-full">
                <p className="text-[10px] text-muted-foreground italic mt-1">Scatter points only (no fitted model)</p>
              </div>
            )}
            {sortedScatterGroups.filter(g => !g.hasModel).map((group) => {
              const refIdx = refIndexMap.get(group.reference) ?? 0;
              const shape = POINT_SHAPES[refIdx % POINT_SHAPES.length];
              return (
                <ScatterOnlyLegendItem
                  key={`legend-scatter-${group.reference}`}
                  reference={group.reference}
                  link={group.link}
                  color={group.color}
                  shape={shape}
                  avgTemp={group.avgTemp}
                  lengthType={group.lengthType}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
