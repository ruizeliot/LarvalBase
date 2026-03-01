"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
 * Summary statistics for a trait (matches TraitCard pattern).
 */
export interface PelagicJuvenileStats {
  mean: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  n: number;
}

/**
 * Comparison stats at one taxonomic level.
 */
export interface ComparisonLevel {
  mean: number;
  n: number;
  speciesCount: number;
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
  sizeStats: PelagicJuvenileStats;
  durationStats: PelagicJuvenileStats;
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
 * Dialog showing raw records for a pelagic juvenile trait in a detailed table.
 */
function RecordsDialog({
  open,
  onOpenChange,
  records,
  label,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: DotStripRecord[];
  label: string;
  unit: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{label} - Raw Data</DialogTitle>
          <DialogDescription>
            {records.length} record{records.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {records.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No records found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Species</TableHead>
                  <TableHead className="text-xs">Mean ({unit})</TableHead>
                  <TableHead className="text-xs">Min ({unit})</TableHead>
                  <TableHead className="text-xs">Max ({unit})</TableHead>
                  <TableHead className="text-xs">N</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={`${r.reference}-${i}`}>
                    <TableCell className="text-xs italic">{r.species || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.mean.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono">{r.errorLow?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.errorHigh?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs">{r.n ?? '-'}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={r.reference}>
                      {r.link ? (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {r.reference}
                        </a>
                      ) : (
                        r.reference
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Numeric trait panel matching the TraitCard layout used by other sections.
 * Displays: mean ± SD, range, N records link, genus/family comparisons, and dot-strip chart.
 */
function NumericTraitPanel({
  label,
  stats,
  unit,
  records,
  comparisons,
  dotStripTitle,
}: {
  label: string;
  stats: PelagicJuvenileStats;
  unit: string;
  records: DotStripRecord[];
  comparisons: { species: ComparisonLevel | null; genus: ComparisonLevel | null; family: ComparisonLevel | null } | null;
  dotStripTitle: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasData = stats.mean !== null;
  const showRange = stats.min !== null && stats.max !== null && stats.min !== stats.max;

  if (records.length === 0 && !comparisons) {
    return (
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
            {label}
          </div>
          <p className="text-sm text-muted-foreground italic mt-2">No {label.toLowerCase()} data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        {/* Label */}
        <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
          {label}
        </div>

        {/* Value: mean ± SD */}
        <div className="mt-2">
          {hasData ? (
            <>
              <span className="text-2xl font-bold font-mono" data-testid="trait-value">
                {stats.mean!.toFixed(2)}
                {stats.sd !== null && (
                  <span className="text-lg font-normal">
                    {" \u00B1 "}
                    {stats.sd.toFixed(2)}
                  </span>
                )}
              </span>
              <div className="text-sm text-muted-foreground mt-1">{unit}</div>
            </>
          ) : (
            <span className="text-lg text-muted-foreground italic">No known values</span>
          )}
        </div>

        {/* Range and Records row */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {showRange ? (
              <>Range: {stats.min!.toFixed(1)} - {stats.max!.toFixed(1)}</>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-primary hover:underline"
            data-testid="records-link"
          >
            {stats.n} record{stats.n !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Genus/Family comparison text (same format as TraitCard) */}
        {comparisons && (comparisons.genus || comparisons.family) && (
          <div className="mt-3 pt-3 border-t space-y-1" data-testid="comparison-text">
            {comparisons.genus && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Genus average:</span>
                <span className="font-mono">
                  {comparisons.genus.mean.toFixed(2)} {unit} (n_sp = {comparisons.genus.speciesCount})
                </span>
              </div>
            )}
            {comparisons.family && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Family average:</span>
                <span className="font-mono">
                  {comparisons.family.mean.toFixed(2)} {unit} (n_sp = {comparisons.family.speciesCount})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dot-strip chart */}
        {records.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <DotStripChart records={records} unit={unit} title={dotStripTitle} />
          </div>
        )}
      </CardContent>

      {/* Raw data table dialog */}
      <RecordsDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        records={records}
        label={label}
        unit={unit}
      />
    </Card>
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
 * PelagicJuvenilePanel renders the complete Pelagic Juvenile section.
 *
 * 3-panel layout matching TraitCard pattern:
 * 1. Qualitative info (known/unknown, keywords, related species)
 * 2. Size: mean ± SD, range, N records link, genus/family comparisons, dot-strip chart
 * 3. Duration: same layout as size panel
 */
export function PelagicJuvenilePanel({ data }: PelagicJuvenilePanelProps) {
  return (
    <div data-testid="pelagic-juvenile-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <QualitativeCard data={data} />
      <NumericTraitPanel
        label="Pelagic Juvenile Size"
        stats={data.sizeStats}
        unit="mm"
        records={data.sizeRecords}
        comparisons={data.comparisonStats?.size ?? null}
        dotStripTitle="Size by reference (mm) — with error bars (±1 SD)"
      />
      <NumericTraitPanel
        label="Pelagic Juvenile Duration"
        stats={data.durationStats}
        unit="days"
        records={data.durationRecords}
        comparisons={data.comparisonStats?.duration ?? null}
        dotStripTitle="Duration by reference (days) — with error bars (±1 SD)"
      />
    </div>
  );
}
