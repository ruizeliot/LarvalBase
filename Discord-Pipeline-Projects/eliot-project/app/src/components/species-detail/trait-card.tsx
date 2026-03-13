"use client";

import React, { useContext } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FamilyBarChart } from "./family-bar-chart";
import type { TaxonomyStats, FamilyBarChartEntry } from "@/lib/types/species.types";
import { SectionComparisonContext } from "./trait-group";
import { SectionTooltip } from "./section-tooltip";
import { TRAIT_TOOLTIPS } from "@/lib/constants/section-tooltips";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * Props for the TraitCard component.
 */
export interface TraitCardProps {
  /** Trait key for tooltip lookup */
  traitKey?: string;
  /** Trait name displayed as label */
  label: string;
  /** Arithmetic mean of measurements, null if no data */
  mean: number | null;
  /** Standard deviation, null if insufficient data */
  sd: number | null;
  /** Minimum value in range, null if no data */
  min: number | null;
  /** Maximum value in range, null if no data */
  max: number | null;
  /** Unit of measurement (e.g., "mm", "days") */
  unit: string;
  /** Number of valid records */
  n: number;
  /** Callback when "N records" link is clicked */
  onRecordsClick?: () => void;
  /** Optional genus comparison stats */
  genusStats?: TaxonomyStats | null;
  /** Optional family comparison stats */
  familyStats?: TaxonomyStats | null;
  /** Optional order comparison stats */
  orderStats?: TaxonomyStats | null;
  /** Optional family bar chart data */
  familyChartData?: FamilyBarChartEntry[] | null;
  /** Comparison type for the chart ('family', 'genus', or 'order') */
  familyChartComparisonType?: 'family' | 'genus' | 'order';
  /** Taxonomy name for the chart (family or genus name) */
  familyChartTaxonomyName?: string;
  /** Current species ID for highlighting in chart */
  currentSpeciesId?: string;
  /** Optional order-level bar chart data */
  orderChartData?: FamilyBarChartEntry[] | null;
  /** Order taxonomy name for order chart */
  orderChartTaxonomyName?: string;
}

/**
 * Formats a number to a fixed decimal places.
 * Returns empty string for null values.
 */
function formatNumber(value: number | null, decimals: number): string {
  if (value === null) return "";
  return value.toFixed(decimals);
}

/**
 * Convert hours to days for incubation duration when >96h.
 * Returns { value, unit } with converted value and unit label.
 */
function convertIncubationIfNeeded(
  value: number | null,
  isIncubation: boolean
): { value: number | null; converted: boolean } {
  if (!isIncubation || value === null || value <= 96) return { value, converted: false };
  return { value: value / 24, converted: true };
}

/**
 * Format comparison value with sample size annotation and optional sd.
 * Returns "-" if no stats available.
 * Format: "0.89 ± 0.12 mm (n_sp = 9)" with "sp" as subscript
 * sd shown only when speciesCount >= 3
 */
function formatComparison(
  stats: TaxonomyStats | null | undefined,
  unit: string,
  isIncubation = false
): React.ReactNode {
  if (!stats || stats.stats.mean === null) return "-";
  const { value: convMean, converted } = convertIncubationIfNeeded(stats.stats.mean, isIncubation);
  const displayUnit = converted ? 'days' : unit;
  const showSd = stats.speciesCount >= 3 && stats.stats.sd !== null;
  const convSd = converted && stats.stats.sd !== null ? stats.stats.sd / 24 : stats.stats.sd;
  return (
    <>
      {convMean!.toFixed(2)}
      {showSd && convSd !== null && <> {"\u00B1"} {convSd.toFixed(2)}</>}
      {" "}{displayUnit} (n<sub>sp</sub> = {stats.speciesCount})
    </>
  );
}

/**
 * TraitCard displays a single trait's statistics.
 *
 * Implements SPEC-06: Trait card with statistics
 * - Label: Trait name (uppercase, muted)
 * - Value: mean +/- SD (bold mono, JetBrains Mono)
 * - Unit: below value (muted)
 * - Range: min - max when different
 * - Link: N records clickable
 */
export function TraitCard({
  traitKey,
  label,
  mean,
  sd,
  min,
  max,
  unit,
  n,
  onRecordsClick,
  genusStats,
  familyStats,
  orderStats,
  familyChartData,
  familyChartComparisonType,
  familyChartTaxonomyName,
  currentSpeciesId,
  orderChartData,
  orderChartTaxonomyName,
}: TraitCardProps) {
  const showComparison = useContext(SectionComparisonContext);
  const { t } = useI18n();
  const hasData = mean !== null;

  // Incubation duration: convert to days if >96h (only in summary cards)
  const isIncubation = traitKey === 'incubation_duration';
  const { value: displayMean, converted: incubConverted } = convertIncubationIfNeeded(mean, isIncubation);
  const displaySd = incubConverted && sd !== null ? sd / 24 : sd;
  const displayMin = incubConverted && min !== null ? min / 24 : min;
  const displayMax = incubConverted && max !== null ? max / 24 : max;
  const displayUnit = incubConverted ? 'days' : unit;

  const showRange = displayMin !== null && displayMax !== null && displayMin !== displayMax;

  // Determine if there's a chart to toggle
  const hasChart = familyChartData && familyChartData.length > 0 && currentSpeciesId &&
    !(familyChartData.length === 1 && familyChartData[0].speciesId === currentSpeciesId);

  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        {/* Label */}
        <div className="text-xs font-medium uppercase text-white tracking-wide flex items-center gap-1">
          {label}
          {traitKey && TRAIT_TOOLTIPS[traitKey] && (
            <SectionTooltip text={TRAIT_TOOLTIPS[traitKey]} />
          )}
        </div>

        {/* Value + Stats row: main value LEFT, summary stats RIGHT */}
        <div className="mt-2 flex items-start justify-between">
          {/* Left side: main value */}
          <div>
            {hasData ? (
              <>
                <span className="text-2xl font-bold font-mono">
                  {formatNumber(displayMean, 2)}
                  {displaySd !== null && (
                    <span className="text-lg font-normal">
                      {" \u00B1 "}
                      {formatNumber(displaySd, 2)}
                    </span>
                  )}
                </span>
                {/* Unit */}
                <div className="text-sm text-muted-foreground mt-1">{displayUnit}</div>
              </>
            ) : (
              <span className="text-lg text-muted-foreground italic">
                {t('no_known_values')}
              </span>
            )}
          </div>

          {/* Right side: Min, Max, records */}
          <div className="text-right text-sm space-y-0.5">
            {showRange && (
              <>
                <div className="text-white">Min: {formatNumber(displayMin, 1)}</div>
                <div className="text-white">Max: {formatNumber(displayMax, 1)}</div>
              </>
            )}
            {/* N records link — grey and non-clickable when 0 */}
            {n === 0 ? (
              <div className="text-muted-foreground">
                0 records
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={onRecordsClick}
                  disabled={!onRecordsClick}
                  className={cn(
                    "text-primary hover:underline",
                    !onRecordsClick && "cursor-default hover:no-underline"
                  )}
                >
                  {n} record{n !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comparison values - only show if any stats provided and speciesCount > 1 */}
        {(genusStats !== undefined || familyStats !== undefined || orderStats !== undefined) && (
          <div className="mt-3 pt-3 border-t space-y-1">
            {genusStats !== undefined && genusStats !== null && (genusStats.speciesCount ?? 0) > 1 && (
              <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted-foreground">{t('genus_average')}:</span>
                <span className="font-mono">{formatComparison(genusStats, displayUnit, isIncubation)}</span>
              </div>
            )}
            {familyStats !== undefined && familyStats !== null && (familyStats.speciesCount ?? 0) > 1 && (
              <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted-foreground">{t('family_average')}:</span>
                <span className="font-mono">{formatComparison(familyStats, displayUnit, isIncubation)}</span>
              </div>
            )}
            {orderStats !== undefined && orderStats !== null && (orderStats.speciesCount ?? 0) > 1 && (
              <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted-foreground">{t('order_average')}:</span>
                <span className="font-mono">{formatComparison(orderStats, displayUnit, isIncubation)}</span>
              </div>
            )}
          </div>
        )}

        {/* Family/Genus Bar Chart — controlled by section-level toggle */}
        {hasChart && showComparison && (
          <div className="mt-4 pt-4 border-t overflow-visible" style={{ minWidth: 0, width: '100%' }}>
            <FamilyBarChart
              data={familyChartData!}
              currentSpeciesId={currentSpeciesId!}
              unit={unit}
              traitLabel={label}
              comparisonType={familyChartComparisonType}
              taxonomyName={familyChartTaxonomyName}
            />
          </div>
        )}
        {/* Order Bar Chart — only as FALLBACK when no family chart is available */}
        {showComparison && !hasChart && orderChartData && orderChartData.length > 1 && currentSpeciesId && (
          <div className="mt-4 pt-4 border-t overflow-visible" style={{ minWidth: 0, width: '100%' }}>
            <FamilyBarChart
              data={orderChartData}
              currentSpeciesId={currentSpeciesId}
              unit={unit}
              traitLabel={label}
              comparisonType="order"
              taxonomyName={orderChartTaxonomyName}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
