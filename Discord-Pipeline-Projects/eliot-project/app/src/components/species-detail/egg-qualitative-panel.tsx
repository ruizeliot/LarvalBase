"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

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
}

interface EggQualitativePanelProps {
  data: EggQualitativeData;
}

/** Human-readable labels for each qualitative trait. */
const TRAIT_LABELS: Record<string, string> = {
  EGG_LOCATION: 'Egg location',
  EGG_DETAILS: 'Egg location details',
  EGG_SHAPE: 'Egg shape',
  NB_OIL_GLOBULE: 'Number of oil globules',
};

/** Colors for each trait's bars. */
const TRAIT_COLORS: Record<string, string> = {
  EGG_LOCATION: '#60a5fa',
  EGG_DETAILS: '#a78bfa',
  EGG_SHAPE: '#4ade80',
  NB_OIL_GLOBULE: '#f59e0b',
};

/** Badge styles per data level. */
const LEVEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  species: { bg: 'bg-green-900/40', text: 'text-green-400', label: 'Species data' },
  genus: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'Genus data' },
  family: { bg: 'bg-red-900/40', text: 'text-red-400', label: 'Family data' },
};

/**
 * DataLevelBadge shows green/yellow/red indicator for data cascade level.
 */
function DataLevelBadge({ level, levelName }: { level: 'species' | 'genus' | 'family'; levelName: string }) {
  const style = LEVEL_STYLES[level];
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.bg} ${style.text}`}
    >
      {style.label}{level !== 'species' ? ` (${levelName})` : ''}
    </span>
  );
}

/**
 * FrequencyBarplot renders horizontal bars for a single qualitative trait.
 */
function FrequencyBarplot({
  entries,
  color,
}: {
  entries: FrequencyEntry[];
  color: string;
}) {
  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => {
        const isUnknown = entry.value === "Unknown";
        const widthPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
        return (
          <div key={entry.value} className="flex items-center gap-2">
            <span
              className={`w-28 text-xs text-right truncate shrink-0 ${
                isUnknown
                  ? "italic text-muted-foreground/60"
                  : "font-semibold text-foreground"
              }`}
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
 * Collapsible references section for a qualitative trait.
 */
function ReferencesDetail({ details }: { details: QualitativeTraitData }) {
  const [expanded, setExpanded] = useState(false);

  if (details.totalRecords === 0 && details.references.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
      >
        {details.totalRecords} record{details.totalRecords !== 1 ? 's' : ''}
        {details.references.length > 0 && ` from ${details.references.length} ref${details.references.length !== 1 ? 's' : ''}`}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && details.references.length > 0 && (
        <div className="mt-1 space-y-0.5 max-h-[120px] overflow-auto">
          {details.references.map((ref, i) => {
            const linkUrl = ref.doi
              ? ref.doi.startsWith("http")
                ? ref.doi
                : `https://doi.org/${ref.doi.replace(/^doi:/, "")}`
              : null;
            return (
              <div key={i} className="text-[10px] text-muted-foreground">
                {linkUrl ? (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {ref.source}
                  </a>
                ) : (
                  <span>{ref.source || "Unknown source"}</span>
                )}
                {ref.species && <span className="italic ml-1">({ref.species})</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Single qualitative trait card - matches TraitCard sizing.
 */
function QualitativeTraitCard({
  traitKey,
  entries,
  color,
  level,
  levelName,
  details,
}: {
  traitKey: string;
  entries: FrequencyEntry[];
  color: string;
  level: 'species' | 'genus' | 'family';
  levelName: string;
  details?: QualitativeTraitData;
}) {
  // Always show all 4 categories - add "Unknown" if no data
  const displayEntries = entries.length > 0 ? entries : [{ value: "Unknown", count: 0 }];

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {TRAIT_LABELS[traitKey]}
          </span>
          <DataLevelBadge level={level} levelName={levelName} />
        </div>
        <FrequencyBarplot entries={displayEntries} color={color} />
        {details && <ReferencesDetail details={details} />}
      </CardContent>
    </Card>
  );
}

/**
 * EggQualitativePanel displays qualitative egg traits as frequency barplots.
 *
 * Implements US-3.1: 4 barplots (EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE)
 * with species → genus → family data cascade and level indicator badge.
 *
 * Each trait is rendered as an individual card matching TraitCard sizing.
 * All 4 traits are always shown — "Unknown" category added when no data exists.
 */
export function EggQualitativePanel({ data }: EggQualitativePanelProps) {
  const traitKeys = ['EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE'] as const;

  return (
    <div data-testid="egg-qualitative-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {traitKeys.map((key) => (
        <QualitativeTraitCard
          key={key}
          traitKey={key}
          entries={data.traits[key] || []}
          color={TRAIT_COLORS[key]}
          level={data.level}
          levelName={data.levelName}
          details={data.traitDetails?.[key]}
        />
      ))}
    </div>
  );
}
