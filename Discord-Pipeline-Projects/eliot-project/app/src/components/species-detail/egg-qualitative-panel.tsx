"use client";

import { Card, CardContent } from "@/components/ui/card";

/**
 * A single frequency bar entry.
 */
export interface FrequencyEntry {
  value: string;
  count: number;
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
  if (entries.length === 0) return null;

  const maxCount = Math.max(...entries.map((e) => e.count));

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => {
        const widthPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
        return (
          <div key={entry.value} className="flex items-center gap-2">
            <span className="w-28 text-xs text-muted-foreground text-right truncate shrink-0">
              {entry.value}
            </span>
            <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
              <div
                data-testid="freq-bar-fill"
                className="h-full rounded flex items-center pl-1.5 text-[10px] font-semibold text-white"
                style={{ width: `${widthPct}%`, backgroundColor: color, minWidth: widthPct > 0 ? '20px' : '0' }}
              >
                {entry.count}
              </div>
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
 * EggQualitativePanel displays qualitative egg traits as frequency barplots.
 *
 * Implements US-3.1: 4 barplots (EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE)
 * with species → genus → family data cascade and level indicator badge.
 */
export function EggQualitativePanel({ data }: EggQualitativePanelProps) {
  const traitKeys = ['EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE'] as const;

  // Check if there is any data at all
  const hasAnyData = traitKeys.some(
    (key) => data.traits[key] && data.traits[key].length > 0
  );

  if (!hasAnyData) return null;

  return (
    <Card data-testid="egg-qualitative-panel" className="bg-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Qualitative Egg Traits</h3>
          <DataLevelBadge level={data.level} levelName={data.levelName} />
        </div>

        {traitKeys.map((key) => {
          const entries = data.traits[key];
          if (!entries || entries.length === 0) return null;
          return (
            <div key={key} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {TRAIT_LABELS[key]}
              </div>
              <FrequencyBarplot entries={entries} color={TRAIT_COLORS[key]} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
