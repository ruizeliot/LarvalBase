"use client";

import { useMemo, useState, useEffect } from "react";
import { TraitCard } from "./trait-card";
import type { LarvalStage } from "./stage-icon";
import { SectionExportButtons } from "./section-export-buttons";
import { getSectionIcon } from "@/lib/constants/section-icons";
import type { ComparisonStats, FamilyBarChartData, FamilyBarChartEntry } from "@/lib/types/species.types";
import { EggQualitativePanel, type EggQualitativeData } from "./egg-qualitative-panel";

/**
 * Trait data for a single trait in the group.
 */
export interface TraitData {
  /** API key for the trait (e.g., "settlement_age") */
  traitKey: string;
  /** Display name of the trait */
  name: string;
  /** Computed statistics for the trait */
  stats: {
    mean: number | null;
    sd: number | null;
    min: number | null;
    max: number | null;
    n: number;
  };
  /** Unit of measurement */
  unit: string;
}

/**
 * Props for the TraitGroup component.
 */
export interface TraitGroupProps {
  /** Group title (e.g., "Settlement Traits", "Egg Traits") */
  title: string;
  /** Optional larval stage for icon display */
  stage?: LarvalStage;
  /** Array of trait data to display */
  traits: TraitData[];
  /** Species ID for fetching raw data for export */
  speciesId?: string;
  /** Callback when records link is clicked, receives trait key and display name */
  onRecordsClick?: (traitKey: string, traitName: string) => void;
  /** Map of trait type to comparison stats */
  comparisons?: Map<string, ComparisonStats>;
  /** Optional qualitative egg data to render inside Egg & Incubation section */
  eggQualitativeData?: EggQualitativeData | null;
}

/**
 * TraitGroup renders a group of related traits with optional stage icon.
 *
 * Implements SPEC-04 (developmental traits) and SPEC-05 (ecological traits):
 * - Section header with optional StageIcon and title
 * - Responsive grid of TraitCards (1 col mobile, 2 col md, 3 col lg)
 * - Returns null if no traits to display
 */
export function TraitGroup({
  title,
  stage,
  traits,
  speciesId,
  onRecordsClick,
  comparisons,
  eggQualitativeData,
}: TraitGroupProps) {
  // Get trait keys for this group
  const traitKeys = useMemo(() => traits.map((t) => t.traitKey), [traits]);

  // State for family/genus chart data per trait (includes comparison type)
  const [familyCharts, setFamilyCharts] = useState<Map<string, FamilyBarChartData>>(new Map());

  // Fetch family/genus chart data for all traits in this group
  useEffect(() => {
    if (!speciesId || traits.length === 0) return;

    const fetchFamilyCharts = async () => {
      const chartMap = new Map<string, FamilyBarChartData>();

      // Fetch in parallel for all traits
      await Promise.all(
        traits.map(async (trait) => {
          try {
            const response = await fetch(
              `/api/species/${speciesId}/family-chart?trait=${encodeURIComponent(trait.traitKey)}`
            );
            if (response.ok) {
              const data: FamilyBarChartData = await response.json();
              chartMap.set(trait.traitKey, data);
            }
          } catch (error) {
            console.error(`Error fetching family chart for ${trait.traitKey}:`, error);
          }
        })
      );

      setFamilyCharts(chartMap);
    };

    fetchFamilyCharts();
  }, [speciesId, traits]);

  // Return null only if no trait definitions exist for this group
  // (Groups with traits but no data will show "No known values" cards)
  if (traits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header with section icon and export button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 56, height: 56, backgroundColor: "#F5F5F5" }}
            title={title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSectionIcon(title)}
              alt={`${title} icon`}
              width={44}
              height={44}
            />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {speciesId && (
          <SectionExportButtons
            speciesId={speciesId}
            sectionTitle={title}
            traitKeys={traitKeys}
          />
        )}
      </div>

      {/* Qualitative egg barplots (inside Egg & Incubation section, above numeric traits) */}
      {eggQualitativeData && (
        <EggQualitativePanel data={eggQualitativeData} />
      )}

      {/* Responsive grid of trait cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {traits.map((trait) => {
          const traitComparisons = comparisons?.get(trait.traitKey);
          const chartData = familyCharts.get(trait.traitKey);
          return (
            <TraitCard
              key={trait.name}
              label={trait.name}
              mean={trait.stats.mean}
              sd={trait.stats.sd}
              min={trait.stats.min}
              max={trait.stats.max}
              unit={trait.unit}
              n={trait.stats.n}
              onRecordsClick={
                onRecordsClick ? () => onRecordsClick(trait.traitKey, trait.name) : undefined
              }
              genusStats={traitComparisons?.genus}
              familyStats={traitComparisons?.family}
              orderStats={traitComparisons?.order}
              familyChartData={chartData?.species}
              familyChartComparisonType={chartData?.comparisonType}
              familyChartTaxonomyName={chartData?.taxonomyName}
              currentSpeciesId={speciesId}
            />
          );
        })}
      </div>
    </div>
  );
}
