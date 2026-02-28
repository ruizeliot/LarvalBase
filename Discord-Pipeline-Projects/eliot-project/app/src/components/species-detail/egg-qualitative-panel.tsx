"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
 * A single frequency bar entry.
 */
export interface FrequencyEntry {
  value: string;
  count: number;
}

/**
 * Reference info for a qualitative trait record.
 */
export interface QualitativeReference {
  source: string;
  doi?: string | null;
  species?: string;
}

/**
 * Per-trait data including frequencies and references.
 */
export interface QualitativeTraitData {
  frequencies: FrequencyEntry[];
  totalRecords: number;
  references: QualitativeReference[];
}

/**
 * Record row for the qualitative records table.
 */
export interface QualitativeRecordRow {
  species: string;
  value: string;
  details?: string;
  externalRef: string;
  mainReference: string;
  link: string;
}

/**
 * Record counts and rows at each taxonomy level for a qualitative trait.
 */
export interface LevelRecords {
  speciesCount: number;
  genusCount: number;
  familyCount: number;
  speciesRows: QualitativeRecordRow[];
  genusRows: QualitativeRecordRow[];
  familyRows: QualitativeRecordRow[];
}

/**
 * Qualitative egg trait data with data level cascade information.
 */
export interface EggQualitativeData {
  /** Data cascade level: species → genus → family */
  level: 'species' | 'genus' | 'family';
  /** Name at the data level (species name, genus name, or family name) */
  levelName: string;
  /** Frequency data per qualitative trait */
  traits: {
    EGG_LOCATION: FrequencyEntry[];
    EGG_DETAILS: FrequencyEntry[];
    EGG_SHAPE: FrequencyEntry[];
    NB_OIL_GLOBULE: FrequencyEntry[];
  };
  /** Detailed trait data with references (optional, for backwards compat) */
  traitDetails?: {
    EGG_LOCATION?: QualitativeTraitData;
    EGG_DETAILS?: QualitativeTraitData;
    EGG_SHAPE?: QualitativeTraitData;
    NB_OIL_GLOBULE?: QualitativeTraitData;
  };
  /** Record counts and rows at each taxonomy level per trait */
  levelRecords?: Record<string, LevelRecords>;
}

interface EggQualitativePanelProps {
  data: EggQualitativeData;
}

/** Human-readable labels for each qualitative trait. */
const TRAIT_LABELS: Record<string, string> = {
  EGG_LOCATION: 'Egg location',
  EGG_SHAPE: 'Egg shape',
  NB_OIL_GLOBULE: 'Number of oil globules',
};

/** Colors for each trait's bars. */
const TRAIT_COLORS: Record<string, string> = {
  EGG_LOCATION: '#60a5fa',
  EGG_SHAPE: '#4ade80',
  NB_OIL_GLOBULE: '#f59e0b',
};

/**
 * Estimate the pixel width of a text string at ~12px font size (text-xs).
 * Uses approximate character widths for a sans-serif font.
 */
function estimateTextWidth(text: string): number {
  // Average ~6.5px per character at 12px font-size for sans-serif
  return Math.ceil(text.length * 6.5);
}

/**
 * FrequencyBarplot renders horizontal bars for a single qualitative trait.
 * Y-axis labels use a fixed width for alignment across barplots.
 */
function FrequencyBarplot({
  entries,
  color,
  labelWidth,
}: {
  entries: FrequencyEntry[];
  color: string;
  /** Fixed label width in pixels for consistent alignment across all barplots */
  labelWidth?: number;
}) {
  const maxCount = Math.max(...entries.map((e) => e.count), 1);
  const fixedWidth = labelWidth ? `${labelWidth}px` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => {
        const isUnknown = entry.value === "Unknown";
        const widthPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
        return (
          <div key={entry.value} className="flex items-center gap-2">
            <span
              className={`text-xs text-right shrink-0 truncate ${
                isUnknown
                  ? "italic text-muted-foreground/60"
                  : "font-semibold text-foreground"
              }`}
              style={{ width: fixedWidth, minWidth: '5rem', maxWidth: '12rem' }}
              title={entry.value}
            >
              {entry.value}
            </span>
            <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
              {entry.count > 0 && (
                <div
                  data-testid="freq-bar-fill"
                  className="h-full rounded flex items-center pl-1.5 text-[10px] font-semibold text-white"
                  style={{ width: `${widthPct}%`, backgroundColor: color, minWidth: '20px' }}
                >
                  {entry.count}
                </div>
              )}
            </div>
            <span className="w-8 text-[10px] text-muted-foreground text-right">
              {entry.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Clickable record count link. Grey and non-clickable if count is 0.
 */
function RecordLink({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  if (count === 0) {
    return (
      <span className="text-[10px] text-muted-foreground/50">
        {count} {label}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className="text-[10px] text-primary hover:underline"
    >
      {count} {label}
    </button>
  );
}

/**
 * Render the main reference: REFERENCE text hyperlinked to LINK URL.
 */
function MainReferenceCell({ text, link }: { text: string; link: string }) {
  if (!text || text === '-') return <span>{text || '-'}</span>;
  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {text}
      </a>
    );
  }
  return <span>{text}</span>;
}

/**
 * Render a species name as a clickable link to the species page.
 */
function SpeciesLink({ name }: { name: string }) {
  if (!name) return <span>-</span>;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return (
    <a href={`/species/${slug}`} className="text-primary hover:underline italic">
      {name}
    </a>
  );
}

/**
 * Modal showing qualitative record rows in a table.
 */
function RecordTableModal({
  open,
  onOpenChange,
  title,
  rows,
  showDetails = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: QualitativeRecordRow[];
  showDetails?: boolean;
}) {
  // Sort rows alphabetically by species name
  const sortedRows = [...rows].sort((a, b) => a.species.localeCompare(b.species));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {sortedRows.length} record{sortedRows.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Species</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                {showDetails && <TableHead className="text-xs">Details</TableHead>}
                <TableHead className="text-xs">Main reference</TableHead>
                <TableHead className="text-xs">External reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs"><SpeciesLink name={row.species} /></TableCell>
                  <TableCell className="text-xs">{row.value}</TableCell>
                  {showDetails && <TableCell className="text-xs">{row.details || '-'}</TableCell>}
                  <TableCell className="text-xs"><MainReferenceCell text={row.mainReference} link={row.link} /></TableCell>
                  <TableCell className="text-xs">{row.externalRef}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Three-level record links (species / genus / family) for a qualitative trait.
 */
function LevelRecordLinks({
  traitKey,
  traitLabel,
  levelRecords,
  showDetails = false,
}: {
  traitKey: string;
  traitLabel: string;
  levelRecords?: LevelRecords;
  showDetails?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalRows, setModalRows] = useState<QualitativeRecordRow[]>([]);

  if (!levelRecords) return null;

  const openModal = (level: string, rows: QualitativeRecordRow[]) => {
    setModalTitle(`${traitLabel} - ${level} records`);
    setModalRows(rows);
    setModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <RecordLink
          count={levelRecords.speciesCount}
          label="species records"
          onClick={() => openModal('Species', levelRecords.speciesRows)}
        />
        <span className="text-muted-foreground/30">|</span>
        <RecordLink
          count={levelRecords.genusCount}
          label="genus records"
          onClick={() => openModal('Genus', levelRecords.genusRows)}
        />
        <span className="text-muted-foreground/30">|</span>
        <RecordLink
          count={levelRecords.familyCount}
          label="family records"
          onClick={() => openModal('Family', levelRecords.familyRows)}
        />
      </div>
      <RecordTableModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalTitle}
        rows={modalRows}
        showDetails={showDetails}
      />
    </>
  );
}

/**
 * Single qualitative trait card - matches TraitCard sizing.
 */
function QualitativeTraitCard({
  traitKey,
  entries,
  color,
  levelRecords,
  detailsText,
  labelWidth,
}: {
  traitKey: string;
  entries: FrequencyEntry[];
  color: string;
  levelRecords?: LevelRecords;
  detailsText?: string;
  labelWidth?: number;
}) {
  const displayEntries = entries.length > 0 ? entries : [{ value: "Unknown", count: 0 }];
  const isEggLocation = traitKey === 'EGG_LOCATION';

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {TRAIT_LABELS[traitKey]}
        </span>
        <FrequencyBarplot entries={displayEntries} color={color} labelWidth={labelWidth} />
        <LevelRecordLinks
          traitKey={traitKey}
          traitLabel={TRAIT_LABELS[traitKey]}
          levelRecords={levelRecords}
          showDetails={isEggLocation}
        />
        {isEggLocation && detailsText && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">Details:</span> {detailsText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * EggQualitativePanel displays qualitative egg traits as frequency barplots.
 *
 * Each trait is rendered as an individual card matching TraitCard sizing.
 * All 4 traits are always shown — "Unknown" category added when no data exists.
 * Shows 3 clickable links per trait: species/genus/family record counts.
 */
export function EggQualitativePanel({ data }: EggQualitativePanelProps) {
  // EGG_DETAILS is shown inside EGG_LOCATION card, not as a separate panel
  const traitKeys = ['EGG_LOCATION', 'EGG_SHAPE', 'NB_OIL_GLOBULE'] as const;

  // Build comma-separated details text from EGG_DETAILS frequencies
  const detailsEntries = data.traits.EGG_DETAILS || [];
  const detailsText = detailsEntries
    .filter((e) => e.value !== 'Unknown')
    .map((e) => e.value)
    .join(', ');

  // Compute consistent label width across all barplots
  const allLabels: string[] = [];
  for (const key of traitKeys) {
    const entries = data.traits[key] || [];
    for (const e of entries) {
      allLabels.push(e.value);
    }
  }
  const maxLabelWidth = allLabels.length > 0
    ? Math.min(192, Math.max(80, Math.max(...allLabels.map(estimateTextWidth)) + 8))
    : 80;

  return (
    <div data-testid="egg-qualitative-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {traitKeys.map((key) => (
        <QualitativeTraitCard
          key={key}
          traitKey={key}
          entries={data.traits[key] || []}
          color={TRAIT_COLORS[key]}
          levelRecords={data.levelRecords?.[key]}
          detailsText={key === 'EGG_LOCATION' ? detailsText : undefined}
          labelWidth={maxLabelWidth}
        />
      ))}
    </div>
  );
}
