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
 * A single record (one data point per reference) for size or age.
 */
export interface RaftingDotStripRecord {
  mean: number;
  errorLow: number | null;
  errorHigh: number | null;
  reference: string;
  link: string | null;
  species: string;
  n?: number;
  extRef?: string | null;
  lengthType?: string | null;
  conf?: number | null;
  confType?: string | null;
  rawMin?: number | null;
  rawMax?: number | null;
  meanType?: string | null;
}

/**
 * A qualitative record for the rafting qualitative panel table.
 */
export interface RaftingQualitativeRecord {
  species: string;
  flotsam: string | null;
  stage: string | null;
  extRef: string | null;
  reference: string;
  link: string | null;
}

/**
 * Summary statistics for a trait.
 */
export interface RaftingStats {
  mean: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  n: number;
}

/**
 * Comparison stats at one taxonomic level.
 */
export interface RaftingComparisonLevel {
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
  comparisonType: 'family' | 'genus';
  taxonomyName: string;
}

/**
 * Frequency count for a qualitative value.
 */
export interface FrequencyCount {
  value: string;
  count: number;
}

/**
 * A qualitative record for the rafting age panel table.
 */
export interface RaftingAgeRecord {
  species: string;
  age: string;
  extRef: string | null;
  reference: string;
  link: string | null;
}

/**
 * Full rafting data for a species.
 */
export interface RaftingData {
  level: 'species' | 'genus' | 'family';
  levelName: string;
  status: 'Known' | 'Unknown';
  flotsamValues: string[];
  stageValues: string[];
  genusSpecies: string[];
  familySpecies: string[];
  qualitativeRecords: RaftingQualitativeRecord[];
  sizeRecords: RaftingDotStripRecord[];
  ageRecords: RaftingDotStripRecord[];
  sizeStats: RaftingStats;
  ageStats: RaftingStats;
  comparisonStats: {
    size: {
      species: RaftingComparisonLevel | null;
      genus: RaftingComparisonLevel | null;
      family: RaftingComparisonLevel | null;
    };
    age: {
      species: RaftingComparisonLevel | null;
      genus: RaftingComparisonLevel | null;
      family: RaftingComparisonLevel | null;
    };
  } | null;
  currentSpeciesId?: string;
  sizeBarChart?: BarChartData | null;
  ageBarChart?: BarChartData | null;
  flotsamFrequencies?: FrequencyCount[];
  stageFrequencies?: FrequencyCount[];
  ageFrequencies?: FrequencyCount[];
  ageQualitativeRecords?: RaftingAgeRecord[];
}

interface RaftingPanelProps {
  data: RaftingData;
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
 * Columns: Name, Flotsam, Stage, External references, Main reference.
 */
function QualitativeRecordsDialog({
  open,
  onOpenChange,
  records,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: RaftingQualitativeRecord[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Rafting - Raw Data</DialogTitle>
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
                  <TableHead className="text-xs">Flotsam</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">External references</TableHead>
                  <TableHead className="text-xs">Main reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={`${r.reference}-${i}`}>
                    <TableCell className="text-xs italic">{r.species}</TableCell>
                    <TableCell className="text-xs">{r.flotsam || '-'}</TableCell>
                    <TableCell className="text-xs">{r.stage || '-'}</TableCell>
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
function QualitativeCard({ data }: { data: RaftingData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isKnown = data.status === 'Known';
  const totalRecords = data.qualitativeRecords.length + data.sizeRecords.length + (data.ageQualitativeRecords?.length ?? 0);

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Rafting
        </span>

        {/* Status */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Rafting</div>
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

        {/* Flotsam type */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Flotsam type</div>
          {/* Show summary text only when no barplot data */}
          {!(data.flotsamFrequencies && data.flotsamFrequencies.length > 0) && (
            <div className="text-sm">
              {data.flotsamValues.length > 0 ? data.flotsamValues.join(', ') : 'NA'}
            </div>
          )}
          {/* Frequency barplots for flotsam */}
          {data.flotsamFrequencies && data.flotsamFrequencies.length > 0 && (
            <div className="mt-2 space-y-1" data-testid="flotsam-barplot">
              {data.flotsamFrequencies.map((f) => {
                const maxCount = Math.max(...data.flotsamFrequencies!.map(x => x.count));
                const widthPct = (f.count / maxCount) * 100;
                return (
                  <div key={f.value} className="flex items-center gap-2 text-xs">
                    <span className="w-28 truncate text-muted-foreground" title={f.value}>{f.value}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${widthPct}%`, backgroundColor: '#00BA38' }}
                        data-testid="freq-bar-fill"
                      />
                    </div>
                    <span className="w-6 text-right font-mono">{f.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stage */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">Stage</div>
          {/* Show summary text only when no barplot data */}
          {!(data.stageFrequencies && data.stageFrequencies.length > 0) && (
            <div className="text-sm">
              {data.stageValues.length > 0 ? data.stageValues.join(', ') : 'NA'}
            </div>
          )}
          {/* Frequency barplots for stage */}
          {data.stageFrequencies && data.stageFrequencies.length > 0 && (
            <div className="mt-2 space-y-1" data-testid="stage-barplot">
              {data.stageFrequencies.map((f) => {
                const maxCount = Math.max(...data.stageFrequencies!.map(x => x.count));
                const widthPct = (f.count / maxCount) * 100;
                return (
                  <div key={f.value} className="flex items-center gap-2 text-xs">
                    <span className="w-28 truncate text-muted-foreground" title={f.value}>{f.value}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${widthPct}%`, backgroundColor: '#00BA38' }}
                        data-testid="freq-bar-fill"
                      />
                    </div>
                    <span className="w-6 text-right font-mono">{f.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Genus species */}
        <div className="border-b pb-2">
          <div className="text-xs text-muted-foreground mb-1">
            Known rafters in this genus
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
            Known rafters in this family
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
 * Dialog showing raw records for a rafting trait in a detailed table.
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
  records: RaftingDotStripRecord[];
  label: string;
  unit: string;
  traitType: 'size' | 'age';
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
                  <TableHead className="text-xs">Mean type</TableHead>
                  {traitType === 'size' && (
                    <TableHead className="text-xs">Length type</TableHead>
                  )}
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
                    <TableCell className="text-xs">{r.meanType || '-'}</TableCell>
                    {traitType === 'size' && (
                      <TableCell className="text-xs">{r.lengthType || '-'}</TableCell>
                    )}
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
 * Numeric trait panel matching the TraitCard layout.
 */
function NumericTraitPanel({
  label,
  stats,
  unit,
  records,
  comparisons,
  barChartData,
  currentSpeciesId,
  traitType,
}: {
  label: string;
  stats: RaftingStats;
  unit: string;
  records: RaftingDotStripRecord[];
  comparisons: { species: RaftingComparisonLevel | null; genus: RaftingComparisonLevel | null; family: RaftingComparisonLevel | null } | null;
  barChartData?: BarChartData | null;
  currentSpeciesId?: string;
  traitType: 'size' | 'age';
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
        <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
          {label}
        </div>

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

        <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {showRange ? (
              <>Range: {stats.min!.toFixed(1)} - {stats.max!.toFixed(1)}</>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
          {/* N records link — grey and non-clickable when 0 */}
          {stats.n === 0 ? (
            <span className="text-muted-foreground" data-testid="records-link">
              0 records
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-primary hover:underline"
              data-testid="records-link"
            >
              {stats.n} record{stats.n !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {comparisons && (
          (comparisons.genus && comparisons.genus.speciesCount > 1) ||
          (comparisons.family && comparisons.family.speciesCount > 1)
        ) && (
          <div className="mt-3 pt-3 border-t space-y-1" data-testid="comparison-text">
            {comparisons.genus && comparisons.genus.speciesCount > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Genus average:</span>
                <span className="font-mono">
                  {comparisons.genus.mean.toFixed(2)} {unit} (n_sp = {comparisons.genus.speciesCount})
                </span>
              </div>
            )}
            {comparisons.family && comparisons.family.speciesCount > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Family average:</span>
                <span className="font-mono">
                  {comparisons.family.mean.toFixed(2)} {unit} (n_sp = {comparisons.family.speciesCount})
                </span>
              </div>
            )}
          </div>
        )}

        {barChartData && barChartData.entries.length > 0 && currentSpeciesId && (
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
      </CardContent>

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
 * Dialog showing rafting age records table.
 * Columns: Name, Age, External references, Main reference.
 */
function AgeRecordsDialog({
  open,
  onOpenChange,
  records,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: RaftingAgeRecord[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Rafting Age - Raw Data</DialogTitle>
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
                  <TableHead className="text-xs">Age</TableHead>
                  <TableHead className="text-xs">External references</TableHead>
                  <TableHead className="text-xs">Main reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={`${r.reference}-${i}`}>
                    <TableCell className="text-xs italic">{r.species}</TableCell>
                    <TableCell className="text-xs">{r.age}</TableCell>
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
 * Qualitative panel for Rafting Age with horizontal barplots.
 */
function AgeQualitativeCard({ data }: { data: RaftingData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const ageRecords = data.ageQualitativeRecords ?? [];
  const ageFrequencies = data.ageFrequencies ?? [];
  const hasData = ageRecords.length > 0 || ageFrequencies.length > 0;

  if (!hasData) {
    return (
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
            Rafting Age
          </div>
          <p className="text-sm text-muted-foreground italic mt-2">No rafting age data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Rafting Age
        </span>

        {/* Records link at top */}
        {ageRecords.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-primary hover:underline text-sm"
              data-testid="age-records-link"
            >
              {ageRecords.length} record{ageRecords.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Frequency barplots for age */}
        {ageFrequencies.length > 0 && (
          <div className="space-y-1" data-testid="age-barplot">
            {ageFrequencies.map((f) => {
              const maxCount = Math.max(...ageFrequencies.map(x => x.count));
              const widthPct = (f.count / maxCount) * 100;
              return (
                <div key={f.value} className="flex items-center gap-2 text-xs">
                  <span className="w-40 truncate text-muted-foreground" title={f.value}>{f.value}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${widthPct}%`, backgroundColor: '#00BA38' }}
                      data-testid="freq-bar-fill"
                    />
                  </div>
                  <span className="w-6 text-right font-mono">{f.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AgeRecordsDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        records={ageRecords}
      />
    </Card>
  );
}

/**
 * RaftingPanel renders the complete Rafting section.
 *
 * 3-panel layout:
 * 1. Qualitative info (known/unknown, flotsam, stage, related species)
 * 2. Size: mean ± SD, range, N records link, genus/family comparisons, bar chart
 * 3. Age: qualitative panel with horizontal barplots
 */
export function RaftingPanel({ data }: RaftingPanelProps) {
  return (
    <div data-testid="rafting-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <QualitativeCard data={data} />
      <NumericTraitPanel
        label="Rafting Size"
        stats={data.sizeStats}
        unit="mm"
        records={data.sizeRecords}
        comparisons={data.comparisonStats?.size ?? null}
        barChartData={data.sizeBarChart}
        currentSpeciesId={data.currentSpeciesId}
        traitType="size"
      />
      <AgeQualitativeCard data={data} />
    </div>
  );
}
