"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

/**
 * A single dot-strip record (one data point per reference).
 */
export interface DotStripRecord {
  mean: number;
  errorLow: number | null;
  errorHigh: number | null;
  reference: string;
  link: string | null;
  species: string;
  n?: number;
}

/**
 * Comparison stats at one taxonomic level.
 */
export interface ComparisonLevel {
  mean: number;
  n: number;
}

/**
 * Full pelagic juvenile data for a species.
 */
export interface PelagicJuvenileData {
  level: 'species' | 'genus' | 'family';
  levelName: string;
  status: 'Known' | 'Unknown';
  keywords: string[];
  genusSpecies: string[];
  familySpecies: string[];
  sizeRecords: DotStripRecord[];
  durationRecords: DotStripRecord[];
  comparisonStats: {
    size: {
      species: ComparisonLevel | null;
      genus: ComparisonLevel | null;
      family: ComparisonLevel | null;
    };
    duration: {
      species: ComparisonLevel | null;
      genus: ComparisonLevel | null;
      family: ComparisonLevel | null;
    };
  } | null;
}

interface PelagicJuvenilePanelProps {
  data: PelagicJuvenileData;
}

/**
 * Renders a species name as a clickable link.
 */
function SpeciesLink({ name }: { name: string }) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return (
    <Link href={`/species/${slug}`} className="text-primary hover:underline italic">
      {name}
    </Link>
  );
}

/**
 * Renders the qualitative information panel.
 */
function QualitativeCard({ data }: { data: PelagicJuvenileData }) {
  const isKnown = data.status === 'Known';

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Pelagic Juvenile
        </span>

        {/* Status */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Pelagic juvenile</div>
          <div className={`text-sm font-semibold ${isKnown ? 'text-green-500' : 'text-red-500'}`}>
            {data.status}
          </div>
        </div>

        {/* Keywords */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Name given</div>
          <div className="text-sm">
            {data.keywords.length > 0 ? data.keywords.join(', ') : 'None'}
          </div>
        </div>

        {/* Genus species */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">
            Known pelagic juvenile in this genus
          </div>
          <div className="text-sm">
            {data.genusSpecies.length > 0 ? (
              <span className="space-x-1">
                {data.genusSpecies.map((name, i) => (
                  <span key={name}>
                    <SpeciesLink name={name} />
                    {i < data.genusSpecies.length - 1 && ', '}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground italic">None known</span>
            )}
          </div>
        </div>

        {/* Family species */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Known pelagic juvenile in this family
          </div>
          <div className="text-sm">
            {data.familySpecies.length > 0 ? (
              <span className="space-x-1">
                {data.familySpecies.map((name, i) => (
                  <span key={name}>
                    <SpeciesLink name={name} />
                    {i < data.familySpecies.length - 1 && ', '}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground italic">None known</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Summary stat card (mean, range, records count).
 */
function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-muted/50 rounded-md p-2 text-center flex-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{unit}</div>
    </div>
  );
}

/**
 * Dot-strip chart showing data points per reference with optional error bars.
 */
function DotStripChart({
  records,
  unit,
  title,
}: {
  records: DotStripRecord[];
  unit: string;
  title: string;
}) {
  if (records.length === 0) return null;

  // Compute domain (min/max across all records including error bars)
  let domainMin = Infinity;
  let domainMax = -Infinity;
  for (const r of records) {
    const lo = r.errorLow ?? r.mean;
    const hi = r.errorHigh ?? r.mean;
    if (lo < domainMin) domainMin = lo;
    if (hi > domainMax) domainMax = hi;
    if (r.mean < domainMin) domainMin = r.mean;
    if (r.mean > domainMax) domainMax = r.mean;
  }

  // Add 10% padding
  const range = domainMax - domainMin || 1;
  domainMin -= range * 0.1;
  domainMax += range * 0.1;

  const toPercent = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * 100;

  // Color palette for alternating dot colors
  const colors = ['#60a5fa', '#a78bfa', '#f59e0b', '#4ade80', '#f472b6', '#38bdf8'];

  return (
    <div data-testid="dot-strip-chart">
      <div className="text-xs text-muted-foreground mb-2">{title}</div>
      <div className="bg-muted/30 rounded-md p-3 space-y-2">
        {records.map((record, i) => {
          const hasError = record.errorLow !== null && record.errorHigh !== null;
          const dotColor = colors[i % colors.length];

          // Shorten reference for display
          const refLabel = record.reference.length > 25
            ? record.reference.slice(0, 25) + '…'
            : record.reference;

          return (
            <div key={`${record.reference}-${i}`} className="flex items-center gap-2" data-testid="strip-row">
              <span
                className="text-[10px] text-muted-foreground text-right shrink-0 truncate"
                style={{ width: '120px' }}
                title={record.reference}
              >
                {refLabel}
              </span>
              <div className="flex-1 h-5 relative bg-muted/50 rounded">
                {/* Error bar */}
                {hasError && (
                  <div
                    data-testid="error-bar"
                    className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-muted-foreground/50"
                    style={{
                      left: `${toPercent(record.errorLow!)}%`,
                      width: `${toPercent(record.errorHigh!) - toPercent(record.errorLow!)}%`,
                    }}
                  >
                    {/* Caps */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-2.5 bg-muted-foreground/50" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-2.5 bg-muted-foreground/50" />
                  </div>
                )}
                {/* Dot */}
                <div
                  data-testid="dot-point"
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background z-10 ${!hasError ? 'opacity-70' : ''}`}
                  style={{
                    left: `${toPercent(record.mean)}%`,
                    backgroundColor: dotColor,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="text-[10px] text-muted-foreground italic mt-1">
          Points without bars = single observation / no reported variance
        </div>
      </div>
    </div>
  );
}

/**
 * Comparison bars showing species/genus/family averages.
 */
function ComparisonBars({
  stats,
  unit,
}: {
  stats: { species: ComparisonLevel | null; genus: ComparisonLevel | null; family: ComparisonLevel | null };
  unit: string;
}) {
  const levels = [
    { key: 'Species', data: stats.species, color: '#60a5fa' },
    { key: 'Genus', data: stats.genus, color: '#a78bfa' },
    { key: 'Family', data: stats.family, color: '#f59e0b' },
  ];

  const maxMean = Math.max(...levels.map((l) => l.data?.mean ?? 0));
  if (maxMean === 0) return null;

  return (
    <div className="mt-3 space-y-1.5" data-testid="comparison-bars">
      {levels.map((level) => {
        if (!level.data) return null;
        const widthPct = (level.data.mean / maxMean) * 100;
        return (
          <div key={level.key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground text-right" style={{ width: '50px' }}>
              {level.key}
            </span>
            <div className="flex-1 h-3.5 bg-muted/50 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${widthPct}%`, backgroundColor: level.color }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground" style={{ width: '50px' }}>
              {level.data.mean.toFixed(1)} {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Size panel with summary stats, dot-strip chart, and comparison bars.
 */
function SizePanel({ data }: { data: PelagicJuvenileData }) {
  const records = data.sizeRecords;
  if (records.length === 0 && !data.comparisonStats?.size) {
    return (
      <Card className="bg-card">
        <CardContent className="p-4">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Pelagic Juvenile Size
          </span>
          <p className="text-sm text-muted-foreground italic mt-2">No size data available</p>
        </CardContent>
      </Card>
    );
  }

  // Compute summary stats
  const means = records.map((r) => r.mean);
  const allMins = records.map((r) => r.errorLow ?? r.mean);
  const allMaxs = records.map((r) => r.errorHigh ?? r.mean);
  const overallMean = means.length > 0 ? means.reduce((a, b) => a + b, 0) / means.length : 0;
  const overallMin = Math.min(...allMins, ...means);
  const overallMax = Math.max(...allMaxs, ...means);

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Pelagic Juvenile Size
        </span>

        {/* Summary stats */}
        <div className="flex gap-2">
          <StatCard label="Mean" value={overallMean.toFixed(1)} unit="mm" />
          <StatCard
            label="Range"
            value={`${overallMin.toFixed(1)}–${overallMax.toFixed(1)}`}
            unit="mm"
          />
          <StatCard label="Records" value={String(records.length)} unit="refs" />
        </div>

        {/* Dot-strip chart */}
        <DotStripChart
          records={records}
          unit="mm"
          title="Size by reference (mm) — with error bars (±1 SD)"
        />

        {/* Comparison bars */}
        {data.comparisonStats?.size && (
          <ComparisonBars stats={data.comparisonStats.size} unit="mm" />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Duration panel with summary stats, dot-strip chart, and comparison bars.
 */
function DurationPanel({ data }: { data: PelagicJuvenileData }) {
  const records = data.durationRecords;
  if (records.length === 0 && !data.comparisonStats?.duration) {
    return (
      <Card className="bg-card">
        <CardContent className="p-4">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Pelagic Juvenile Duration
          </span>
          <p className="text-sm text-muted-foreground italic mt-2">No duration data available</p>
        </CardContent>
      </Card>
    );
  }

  const means = records.map((r) => r.mean);
  const allMins = records.map((r) => r.errorLow ?? r.mean);
  const allMaxs = records.map((r) => r.errorHigh ?? r.mean);
  const overallMean = means.length > 0 ? means.reduce((a, b) => a + b, 0) / means.length : 0;
  const overallMin = Math.min(...allMins, ...means);
  const overallMax = Math.max(...allMaxs, ...means);

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Pelagic Juvenile Duration
        </span>

        <div className="flex gap-2">
          <StatCard label="Mean" value={overallMean.toFixed(1)} unit="days" />
          <StatCard
            label="Range"
            value={`${overallMin.toFixed(1)}–${overallMax.toFixed(1)}`}
            unit="days"
          />
          <StatCard label="Records" value={String(records.length)} unit="refs" />
        </div>

        <DotStripChart
          records={records}
          unit="days"
          title="Duration by reference (days) — with error bars (±1 SD)"
        />

        {data.comparisonStats?.duration && (
          <ComparisonBars stats={data.comparisonStats.duration} unit="d" />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * PelagicJuvenilePanel renders the complete Pelagic Juvenile section.
 *
 * 3-panel layout:
 * 1. Qualitative info (known/unknown, keywords, related species)
 * 2. Dot-strip chart for size with error bars and comparison bars
 * 3. Dot-strip chart for duration with error bars and comparison bars
 */
export function PelagicJuvenilePanel({ data }: PelagicJuvenilePanelProps) {
  return (
    <div data-testid="pelagic-juvenile-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <QualitativeCard data={data} />
      <SizePanel data={data} />
      <DurationPanel data={data} />
    </div>
  );
}
