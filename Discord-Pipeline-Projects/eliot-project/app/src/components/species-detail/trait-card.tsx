"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FamilyBarChart } from "./family-bar-chart";
import type { TaxonomyStats, FamilyBarChartEntry } from "@/lib/types/species.types";

/**
 * Props for the TraitCard component.
 */
export interface TraitCardProps {
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
  /** Comparison type for the chart ('family' or 'genus') */
  familyChartComparisonType?: 'family' | 'genus';
  /** Taxonomy name for the chart (family or genus name) */
  familyChartTaxonomyName?: string;
  /** Current species ID for highlighting in chart */
  currentSpeciesId?: string;
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
 * Format comparison value with sample size annotation.
 * Returns "-" if no stats available.
 * Format: "0.89 mm (n_sp = 9)" with "sp" as subscript
 */
function formatComparison(
  stats: TaxonomyStats | null | undefined,
  unit: string
): React.ReactNode {
  if (!stats || stats.stats.mean === null) return "-";
  return <>{stats.stats.mean.toFixed(2)} {unit} (n<sub>sp</sub> = {stats.speciesCount})</>;
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
}: TraitCardProps) {
  const [showComparison, setShowComparison] = useState(false);
  const hasData = mean !== null;
  const showRange = min !== null && max !== null && min !== max;

  // Determine if there's a chart to toggle
  const hasChart = familyChartData && familyChartData.length > 0 && currentSpeciesId &&
    !(familyChartData.length === 1 && familyChartData[0].speciesId === currentSpeciesId);

  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        {/* Label */}
        <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
          {label}
        </div>

        {/* Value: mean +/- SD or fallback to genus/family/order average */}
        <div className="mt-2">
          {hasData ? (
            <>
              <span className="text-2xl font-bold font-mono">
                {formatNumber(mean, 2)}
                {sd !== null && (
                  <span className="text-lg font-normal">
                    {" \u00B1 "}
                    {formatNumber(sd, 2)}
                  </span>
                )}
              </span>
              {/* Unit */}
              <div className="text-sm text-muted-foreground mt-1">{unit}</div>
            </>
          ) : (
            <span className="text-lg text-muted-foreground italic">
              No known values
            </span>
          )}
        </div>

        {/* Range and Records row */}
        <div
          className={cn(
            "mt-3 pt-3 border-t flex items-center justify-between",
            "text-sm"
          )}
        >
          {/* Range */}
          <div className="text-muted-foreground">
            {showRange ? (
              <>
                Range: {formatNumber(min, 1)} - {formatNumber(max, 1)}
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>

          {/* N records link — grey and non-clickable when 0 */}
          {n === 0 ? (
            <span className="text-muted-foreground">
              0 records
            </span>
          ) : (
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
          )}
        </div>

        {/* Comparison values - only show if any stats provided and speciesCount > 1 */}
        {(genusStats !== undefined || familyStats !== undefined || orderStats !== undefined) && (
          <div className="mt-3 pt-3 border-t space-y-1">
            {genusStats !== undefined && genusStats !== null && (genusStats.speciesCount ?? 0) > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Genus average:</span>
                <span className="font-mono">{formatComparison(genusStats, unit)}</span>
              </div>
            )}
            {familyStats !== undefined && familyStats !== null && (familyStats.speciesCount ?? 0) > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Family average:</span>
                <span className="font-mono">{formatComparison(familyStats, unit)}</span>
              </div>
            )}
            {orderStats !== undefined && orderStats !== null && (orderStats.speciesCount ?? 0) > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order average:</span>
                <span className="font-mono">{formatComparison(orderStats, unit)}</span>
              </div>
            )}
          </div>
        )}

        {/* Family/Genus Bar Chart — hidden by default, toggle button */}
        {hasChart && (
          <div className="mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors w-full text-center"
            >
              {showComparison ? "Click to hide comparison" : "Click to show comparison between taxa"}
            </button>
            {showComparison && (
              <div className="mt-3">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
