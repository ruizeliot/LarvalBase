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
  const { images, isLoading } = useSpeciesImages(speciesId);

  return (
    <div className="flex gap-6">
      {/* Image gallery or skeleton */}
      <div className="flex-shrink-0 w-[200px]">
        {isLoading ? (
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
        ) : (
          <SpeciesImageGallery images={images} speciesName={scientificName} />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 space-y-2">
        {/* Scientific name with large family icon */}
        <div className="flex items-start gap-4">
          <FamilyIcon family={family} size={72} className="shrink-0 mt-1" />
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold italic">{scientificName}</h1>
            {/* Taxonomy line */}
            <div className="text-muted-foreground">
              {commonName && (
                <>
                  <span>{commonName}</span>
                  <span className="mx-2">|</span>
                </>
              )}
              <span>{family}</span>
              <span className="mx-2">|</span>
              <span>{cleanOrderName(order)}</span>
            </div>
          </div>
        </div>

        {/* Stats line */}
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
