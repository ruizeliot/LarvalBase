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
import { FamilyBarChart } from "./family-bar-chart";

/**
 * A single record (one data point per reference).
 */
export interface DotStripRecord {
  mean: number;
  errorLow: number | null;
  errorHigh: number | null;
  reference: string;
  link: string | null;
  species: string;
  n?: number;
  keyword?: string | null;
  remarks?: string | null;
  extRef?: string | null;
  lengthType?: string | null;
  conf?: number | null;
  confType?: string | null;
  rawMin?: number | null;
  rawMax?: number | null;
  meanType?: string | null;
}

/**
 * A qualitative record for the pelagic juvenile qualitative panel table.
 */
export interface QualitativeRecord {
  species: string;
  keyword: string | null;
  remarks: string | null;
  extRef: string | null;
  reference: string;
  link: string | null;
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
 * Single species entry for bar chart comparison.
 */
export interface BarChartSpeciesEntry {
  speciesId: string;
  speciesName: string;
  meanValue: number;
}

/**
 * Bar chart comparison data at family or genus level.
 */
export interface BarChartData {
  entries: BarChartSpeciesEntry[];
  comparisonType: 'family' | 'genus' | 'order';
  taxonomyName: string;
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
  qualitativeRecords: QualitativeRecord[];
  sizeRecords: DotStripRecord[];
  durationRecords: DotStripRecord[];
  sizeStats: PelagicJuvenileStats;
  durationStats: PelagicJuvenileStats;
  comparisonStats: {
    size: {
      species: ComparisonLevel | null;
      genus: ComparisonLevel | null;
      family: ComparisonLevel | null;
      order?: ComparisonLevel | null;
    };
    duration: {
      species: ComparisonLevel | null;
      genus: ComparisonLevel | null;
      family: ComparisonLevel | null;
      order?: ComparisonLevel | null;
    };
  } | null;
  currentSpeciesId?: string;
  sizeBarChart?: BarChartData | null;
  durationBarChart?: BarChartData | null;
  sizeOrderBarChart?: BarChartData | null;
  durationOrderBarChart?: BarChartData | null;
}

interface PelagicJuvenilePanelProps {
  data: PelagicJuvenileData;
  showComparison?: boolean;
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
 * Dialog showing qualitative records table.
 * Columns: Name (VALID_NAME), Key word (KEY_WORD), Remarks (REMARKS),
 * External References (EXT_REF), Main references (REFERENCE with LINK as hyperlink).
 */
function QualitativeRecordsDialog({
  open,
  onOpenChange,
  records,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: QualitativeRecord[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pelagic Juvenile - Raw Data</DialogTitle>
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
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Key word</TableHead>
                  <TableHead className="text-xs">Remarks</TableHead>
                  <TableHead className="text-xs">External references</TableHead>
                  <TableHead className="text-xs">Main reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={`${r.reference}-${i}`}>
                    <TableCell className="text-xs italic">{r.species}</TableCell>
                    <TableCell className="text-xs">{r.keyword || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[200px]">{r.remarks || '-'}</TableCell>
                    <TableCell className="text-xs">{r.extRef || '-'}</TableCell>
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
 * Renders the qualitative information panel.
 */
function QualitativeCard({ data }: { data: PelagicJuvenileData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isKnown = data.status === 'Known';
  const totalRecords = data.qualitativeRecords.length + data.sizeRecords.length + data.durationRecords.length;

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Pelagic Juvenile
        </span>

        {/* Status */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Pelagic juvenile</div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isKnown ? 'text-green-500' : 'text-red-500'}`}>
              {data.status}
            </span>
            {totalRecords > 0 ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-primary hover:underline text-sm"
                data-testid="qualitative-records-link"
              >
                {totalRecords} record{totalRecords !== 1 ? 's' : ''}
              </button>
            ) : (
              <span className="text-muted-foreground text-sm">0 records</span>
            )}
          </div>
        </div>

        {/* Keywords */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Name given</div>
          <div className="text-sm">
            {data.keywords.length > 0 ? data.keywords.join(', ') : 'NA'}
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
        <div className={data.qualitativeRecords.length > 0 ? "border-b pb-2" : ""}>
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

      <QualitativeRecordsDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        records={data.qualitativeRecords}
      />
    </Card>
  );
}

/**
 * Dialog showing raw records for a pelagic juvenile trait in a detailed table.
 * Columns: Name (VALID_NAME), Mean, Min, Max, Confidence interval, Mean type, CI type, External references, Main reference
 */
function RecordsDialog({
  open,
  onOpenChange,
  records,
  label,
  unit,
  traitType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: DotStripRecord[];
  label: string;
  unit: string;
  traitType: 'size' | 'duration';
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
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
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Mean</TableHead>
                  <TableHead className="text-xs">Min</TableHead>
                  <TableHead className="text-xs">Max</TableHead>
                  <TableHead className="text-xs">Confidence interval</TableHead>
                  <TableHead className="text-xs">Mean type</TableHead>
                  <TableHead className="text-xs">Confidence interval type</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs">External references</TableHead>
                  <TableHead className="text-xs">Main reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={`${r.reference}-${i}`}>
                    <TableCell className="text-xs italic">{r.species}</TableCell>
                    <TableCell className="text-xs font-mono">{r.mean.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono">{r.rawMin?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.rawMax?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.conf?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-xs">
                      {traitType === 'size' ? (r.lengthType || '-') : (r.meanType || '-')}
                    </TableCell>
                    <TableCell className="text-xs">{r.confType || '-'}</TableCell>
                    <TableCell className="text-xs">{unit}</TableCell>
                    <TableCell className="text-xs">{r.extRef || '-'}</TableCell>
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
 * Displays: mean ± SD, range, N records link, genus/family comparisons, and bar chart.
 */
function NumericTraitPanel({
  label,
  stats,
  unit,
  records,
  comparisons,
  barChartData,
  orderBarChartData,
  currentSpeciesId,
  traitType,
  showComparison,
}: {
  label: string;
  stats: PelagicJuvenileStats;
  unit: string;
  records: DotStripRecord[];
  comparisons: { species: ComparisonLevel | null; genus: ComparisonLevel | null; family: ComparisonLevel | null; order?: ComparisonLevel | null } | null;
  barChartData?: BarChartData | null;
  orderBarChartData?: BarChartData | null;
  currentSpeciesId?: string;
  traitType: 'size' | 'duration';
  showComparison?: boolean;
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

        {/* Range/Records row */}
        <div className="mt-3 pt-3 border-t flex items-start justify-between text-sm">
          <div>&nbsp;</div>
          <div className="text-right space-y-0.5">
            {showRange && (
              <>
                <div className="text-white">Min: {stats.min!.toFixed(1)}</div>
                <div className="text-white">Max: {stats.max!.toFixed(1)}</div>
              </>
            )}
            {stats.n === 0 ? (
              <div className="text-muted-foreground" data-testid="records-link">
                0 records
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="text-primary hover:underline"
                  data-testid="records-link"
                >
                  {stats.n} record{stats.n !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Genus/Family/Order comparison text — hide when only 1 species known */}
        {comparisons && (
          (comparisons.genus && comparisons.genus.speciesCount > 1) ||
          (comparisons.family && comparisons.family.speciesCount > 1) ||
          (comparisons.order && comparisons.order.speciesCount > 1)
        ) && (
          <div className="mt-3 pt-3 border-t space-y-1" data-testid="comparison-text">
            {comparisons.genus && comparisons.genus.speciesCount > 1 && (
              <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted-foreground">Genus average:</span>
                <span className="font-mono">
                  {comparisons.genus.mean.toFixed(2)} {unit} (n<sub>sp</sub> = {comparisons.genus.speciesCount})
                </span>
              </div>
            )}
            {comparisons.family && comparisons.family.speciesCount > 1 && (
              <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted-foreground">Family average:</span>
                <span className="font-mono">
                  {comparisons.family.mean.toFixed(2)} {unit} (n<sub>sp</sub> = {comparisons.family.speciesCount})
                </span>
              </div>
            )}
            {comparisons.order && comparisons.order.speciesCount > 1 && (
              <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted-foreground">Order average:</span>
                <span className="font-mono">
                  {comparisons.order.mean.toFixed(2)} {unit} (n<sub>sp</sub> = {comparisons.order.speciesCount})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Family/genus bar chart comparison — controlled by section-level toggle */}
        {showComparison && barChartData && barChartData.entries.length > 0 && currentSpeciesId && (
          <div className="mt-4 pt-4 border-t">
            <FamilyBarChart
              data={barChartData.entries}
              currentSpeciesId={currentSpeciesId}
              unit={unit}
              traitLabel={label}
              comparisonType={barChartData.comparisonType}
              taxonomyName={barChartData.taxonomyName}
            />
          </div>
        )}
        {/* Order bar chart comparison */}
        {showComparison && orderBarChartData && orderBarChartData.entries.length > 0 && currentSpeciesId && (
          <div className="mt-4 pt-4 border-t">
            <FamilyBarChart
              data={orderBarChartData.entries}
              currentSpeciesId={currentSpeciesId}
              unit={unit}
              traitLabel={label}
              comparisonType="order"
              taxonomyName={orderBarChartData.taxonomyName}
            />
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
        traitType={traitType}
      />
    </Card>
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
export function PelagicJuvenilePanel({ data, showComparison }: PelagicJuvenilePanelProps) {
  return (
    <div data-testid="pelagic-juvenile-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <QualitativeCard data={data} />
      <NumericTraitPanel
        label="Pelagic Juvenile Size"
        stats={data.sizeStats}
        unit="mm"
        records={data.sizeRecords}
        comparisons={data.comparisonStats?.size ?? null}
        barChartData={data.sizeBarChart}
        orderBarChartData={data.sizeOrderBarChart}
        currentSpeciesId={data.currentSpeciesId}
        traitType="size"
        showComparison={showComparison}
      />
      <NumericTraitPanel
        label="Pelagic Juvenile Duration"
        stats={data.durationStats}
        unit="days"
        records={data.durationRecords}
        comparisons={data.comparisonStats?.duration ?? null}
        barChartData={data.durationBarChart}
        orderBarChartData={data.durationOrderBarChart}
        currentSpeciesId={data.currentSpeciesId}
        traitType="duration"
        showComparison={showComparison}
      />
    </div>
  );
}
