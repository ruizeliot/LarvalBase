"use client";

import { SpeciesImageGallery } from "./species-image-gallery";
import { FamilyIcon } from "./family-icon";
import { useSpeciesImages } from "@/hooks/use-species-images";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanOrderName } from "@/lib/utils/clean-order-name";

/**
 * Props for the SpeciesHeader component.
 */
export interface SpeciesHeaderProps {
  /** Species ID (URL slug format for API fetching) */
  speciesId: string;
  /** Scientific name (displayed in italic) */
  scientificName: string;
  /** Common name if available */
  commonName: string | null;
  /** Taxonomic family */
  family: string;
  /** Taxonomic order */
  order: string;
  /** Total number of records */
  recordCount: number;
  /** Number of studies/sources */
  studyCount: number;
}

/**
 * SpeciesHeader displays the species identification, images, and stats.
 *
 * Implements:
 * - SPEC-01: Header with scientific name (italic), common name, family, order
 * - SPEC-02: Image gallery replaces placeholder (IMG-05)
 * - SPEC-03: Record count and study count
 * - ICON-02: Family icon next to family name
 * - ICON-03: Order icon next to order name (uses a family from that order)
 */
export function SpeciesHeader({
  speciesId,
  scientificName,
  commonName,
  family,
  order,
  recordCount,
  studyCount,
}: SpeciesHeaderProps) {
  const { images, orderFamily, isLoading } = useSpeciesImages(speciesId);

  return (
    <div className="flex gap-6">
      {/* Image gallery or skeleton (SPEC-02, IMG-05) */}
      <div className="flex-shrink-0 w-[200px]">
        {isLoading ? (
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
        ) : (
          <SpeciesImageGallery images={images} speciesName={scientificName} />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 space-y-2">
        {/* Scientific name (SPEC-01) */}
        <h1 className="text-[28px] font-semibold italic">{scientificName}</h1>

        {/* Taxonomy line with icons */}
        <div className="text-muted-foreground">
          {commonName && (
            <>
              <span>{commonName}</span>
              <span className="mx-2">|</span>
            </>
          )}
          {/* Family with icon (ICON-02) */}
          <span className="inline-flex items-center gap-1.5">
            <FamilyIcon family={family} size={24} className="inline-flex" />
            <span>{family}</span>
          </span>
          <span className="mx-2">|</span>
          {/* Order with icon (ICON-03) - uses family from order if available */}
          <span className="inline-flex items-center gap-1.5">
            {orderFamily ? (
              <FamilyIcon family={orderFamily} size={24} className="inline-flex" />
            ) : (
              <FamilyIcon family="_placeholder_" size={24} className="inline-flex" />
            )}
            <span>{cleanOrderName(order)}</span>
          </span>
        </div>

        {/* Stats line (SPEC-03) */}
        <div className="flex gap-4 text-sm">
          <span>
            <span className="font-mono font-bold">{recordCount}</span> record
            {recordCount !== 1 ? "s" : ""}
          </span>
          <span>
            <span className="font-mono font-bold">{studyCount}</span> stud
            {studyCount !== 1 ? "ies" : "y"}
          </span>
        </div>
      </div>
    </div>
  );
}
