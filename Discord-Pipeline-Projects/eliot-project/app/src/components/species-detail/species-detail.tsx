"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSpeciesDetail } from "@/hooks/use-species-detail";
import { useRawData } from "@/hooks/use-raw-data";
import { SpeciesHeader } from "./species-header";
import { TraitGroup, type TraitData } from "./trait-group";
import { CollectionMap } from "./collection-map";
import { ReferencesSection } from "./references-section";
import { RawDataModal } from "./raw-data-modal";
import { SpeciesGrowthChart } from "./species-growth-chart";
import { ExportButton } from "@/components/export/export-button";
import { EggQualitativePanel } from "./egg-qualitative-panel";
import { useEggQualitative } from "@/hooks/use-egg-qualitative";
import { PelagicJuvenilePanel } from "./pelagic-juvenile-panel";
import { usePelagicJuvenile } from "@/hooks/use-pelagic-juvenile";
import { RaftingPanel } from "./rafting-panel";
import { useRafting } from "@/hooks/use-rafting";
import { SectionExportButtons } from "./section-export-buttons";
import { isAllEggsSpherical } from "./egg-spherical-helper";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatTraitName } from "@/lib/constants/trait-groups";
import { DISPLAY_GROUPS, TRAIT_UNITS } from "./species-detail-config";
import { getSectionIcon } from "@/lib/constants/section-icons";
import type { ComparisonStats } from "@/lib/types/species.types";

/**
 * Props for the SpeciesDetail component.
 */
export interface SpeciesDetailProps {
  /** Species ID to display */
  speciesId: string;
}

// DISPLAY_GROUPS and TRAIT_UNITS imported from species-detail-config.ts

/**
 * Loading skeleton for species detail view.
 */
function SpeciesDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex gap-6">
        <Skeleton className="w-[120px] h-[120px] rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>

      {/* Trait groups skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>

      {/* Map skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>

      {/* References skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Error display for species detail.
 */
function SpeciesDetailError({ error }: { error: string }) {
  return (
    <Card className="bg-destructive/10">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-destructive">
          Error Loading Species
        </h2>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </CardContent>
    </Card>
  );
}

/**
 * SpeciesDetail container that fetches and displays species data.
 *
 * Orchestrates:
 * - SpeciesHeader: Species identification and stats
 * - TraitGroups: Developmental and ecological trait cards
 * - CollectionMap: GPS map with collection location markers
 * - ReferencesSection: Clickable DOI links for citations
 * - RawDataModal: Modal showing raw measurements for a trait
 */
export function SpeciesDetail({ speciesId }: SpeciesDetailProps) {
  const { data, isLoading, error, recordCount, studyCount, locations, references } =
    useSpeciesDetail(speciesId);

  // Fetch all raw data for export (no trait type filter)
  const { data: allRawData } = useRawData(speciesId, undefined, true);

  // Fetch qualitative egg data (US-3.1)
  const { data: eggQualitativeData } = useEggQualitative(speciesId);

  // Fetch pelagic juvenile data (Epic 6)
  const { data: pelagicJuvenileData } = usePelagicJuvenile(speciesId);

  // Fetch rafting data (Epic 7)
  const { data: raftingData } = useRafting(speciesId);

  // Modal state for raw data display
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<{
    traitType: string;
    traitName: string;
  } | null>(null);

  // State for comparison stats (genus/family/order averages)
  const [comparisons, setComparisons] = useState<Map<string, ComparisonStats>>(new Map());

  // Fetch comparison stats for all trait types once species data loads
  useEffect(() => {
    if (!data) return;

    // Get unique trait types that have data
    const traitTypesWithData = Object.keys(data.traits);
    if (traitTypesWithData.length === 0) return;

    // Fetch comparisons for all trait types in parallel
    async function fetchAllComparisons() {
      const results = new Map<string, ComparisonStats>();

      await Promise.all(
        traitTypesWithData.map(async (trait) => {
          try {
            const res = await fetch(`/api/species/${speciesId}/comparisons?trait=${trait}`);
            if (res.ok) {
              const comparisonData = await res.json();
              results.set(trait, comparisonData);
            }
          } catch (err) {
            console.warn(`Failed to fetch comparisons for ${trait}:`, err);
          }
        })
      );

      setComparisons(results);
    }

    fetchAllComparisons();
  }, [data, speciesId]);

  // Handler for when "N records" is clicked on a trait card
  const handleRecordsClick = useCallback((traitType: string, traitName: string) => {
    setSelectedTrait({ traitType, traitName });
    setModalOpen(true);
  }, []);

  // Prepare export data for all traits
  const allTraitsExportData = useMemo(() => {
    return allRawData.map((measurement) => ({
      Trait_Type: measurement.traitType,
      Value: measurement.value,
      Unit: measurement.unit,
      Reference: measurement.source || "",
      DOI: measurement.doi || "",
    }));
  }, [allRawData]);

  // Loading state
  if (isLoading) {
    return <SpeciesDetailSkeleton />;
  }

  // Error state
  if (error) {
    return <SpeciesDetailError error={error} />;
  }

  // No data state
  if (!data) {
    return null;
  }

  // Check if all eggs are spherical (for egg width/diameter logic)
  // egg_width data only exists when EGG_W_MEAN differs from EGG_L_MEAN (see data-repository.ts)
  const hasEggWidthData = data ? (data.traits['egg_width']?.n ?? 0) > 0 : false;
  const allEggsSpherical = isAllEggsSpherical(eggQualitativeData ?? null, hasEggWidthData);

  // Map API traits to display groups
  // Show ALL trait categories, with "No known values" for traits without data
  const traitGroups = DISPLAY_GROUPS.map((group) => {
    const traits: TraitData[] = [];

    for (const traitKey of group.traits) {
      // If all eggs are spherical, hide egg_width and rename egg_diameter to "Egg Diameter"
      if (allEggsSpherical && traitKey === 'egg_width') continue;

      const stats = data.traits[traitKey];
      let displayName = formatTraitName(traitKey);
      if (allEggsSpherical && traitKey === 'egg_diameter') {
        displayName = 'Egg Diameter';
      }

      // Always include the trait - TraitCard will show "No known values" if no data
      traits.push({
        traitKey,
        name: displayName,
        stats: {
          mean: stats?.mean ?? null,
          sd: stats?.sd ?? null,
          min: stats?.min ?? null,
          max: stats?.max ?? null,
          n: stats?.n ?? 0,
        },
        unit: TRAIT_UNITS[traitKey] || group.unit,
      });
    }

    return {
      ...group,
      traits,
    };
  });

  return (
    <div className="space-y-8">
      {/* Species Header */}
      <SpeciesHeader
        speciesId={speciesId}
        scientificName={data.species.scientificName}
        commonName={data.species.commonName}
        family={data.species.family}
        order={data.species.order}
        recordCount={recordCount}
        studyCount={studyCount}
      />

      {/* Export All Traits Button */}
      <div className="flex justify-end">
        <ExportButton
          data={allTraitsExportData}
          filename={`${data.species.scientificName.toLowerCase().replace(/\s+/g, "-")}-all-traits`}
          label="Export All Traits"
          variant="outline"
          size="sm"
        />
      </div>

      {/* Growth Curves Chart - At the top, before traits */}
      <SpeciesGrowthChart
        speciesId={speciesId}
        speciesName={data.species.scientificName}
      />

      {/* Trait Groups with Map after Settlement */}
      {traitGroups.length > 0 ? (
        <div className="space-y-8">
          {traitGroups.map((group, index) => (
            <div key={group.title}>
              <TraitGroup
                title={group.title}
                stage={group.stage}
                traits={group.traits}
                speciesId={speciesId}
                onRecordsClick={(traitKey: string, traitName: string) => {
                  handleRecordsClick(traitKey, traitName);
                }}
                comparisons={comparisons}
                eggQualitativeData={group.title === "Egg & Incubation" ? eggQualitativeData : undefined}
              />
              {/* Insert map after Settlement section */}
              {group.title === "Settlement" && (
                <>
                  {/* Settlement-stage sampling locations — only show if GPS data exists */}
                  {locations.length > 0 && locations.some(
                    (loc) => loc.latitude != null && loc.longitude != null && !isNaN(loc.latitude) && !isNaN(loc.longitude)
                  ) && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-full shrink-0"
                        style={{ width: 56, height: 56, backgroundColor: "#F5F5F5" }}
                        title="Settlement-stage sampling locations"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getSectionIcon("Settlement-stage sampling locations")}
                          alt="Settlement-stage sampling locations icon"
                          width={44}
                          height={44}
                        />
                      </div>
                      <h2 className="text-lg font-semibold">Settlement-stage sampling locations</h2>
                    </div>
                    <CollectionMap locations={locations} />
                  </div>
                  )}

                  {/* Pelagic Juvenile section (Epic 6) — after Settlement, before Swimming */}
                  {pelagicJuvenileData && (
                    <div className="space-y-4 mt-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center rounded-full shrink-0"
                            style={{ width: 56, height: 56, backgroundColor: "#F5F5F5" }}
                            title="Pelagic Juvenile"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getSectionIcon("Pelagic Juvenile")}
                              alt="Pelagic Juvenile icon"
                              width={44}
                              height={44}
                            />
                          </div>
                          <h2 className="text-lg font-semibold">Pelagic Juvenile</h2>
                        </div>
                        <SectionExportButtons
                          speciesId={speciesId}
                          sectionTitle="Pelagic Juvenile"
                          traitKeys={['pelagic_juvenile_size', 'pelagic_juvenile_duration']}
                        />
                      </div>
                      <PelagicJuvenilePanel data={pelagicJuvenileData} />
                    </div>
                  )}

                  {/* Rafting section (Epic 7) — after Pelagic Juvenile */}
                  {raftingData && (
                    <div className="space-y-4 mt-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center rounded-full shrink-0"
                            style={{ width: 56, height: 56, backgroundColor: "#F5F5F5" }}
                            title="Rafting"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getSectionIcon("Rafting")}
                              alt="Rafting icon"
                              width={44}
                              height={44}
                            />
                          </div>
                          <h2 className="text-lg font-semibold">Rafting</h2>
                        </div>
                        <SectionExportButtons
                          speciesId={speciesId}
                          sectionTitle="Rafting"
                          traitKeys={['rafting_behavior', 'rafting_size']}
                        />
                      </div>
                      <RaftingPanel data={raftingData} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No trait data available for this species.
            </p>
          </CardContent>
        </Card>
      )}

      {/* References Section */}
      <ReferencesSection references={references} />

      {/* Raw Data Modal */}
      {selectedTrait && (
        <RawDataModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          speciesId={speciesId}
          speciesName={data.species.scientificName}
          traitType={selectedTrait.traitType}
          traitName={selectedTrait.traitName}
        />
      )}
    </div>
  );
}
