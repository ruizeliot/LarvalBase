"use client";

import { useState, useCallback } from "react";
import { SpeciesImageGallery } from "./species-image-gallery";
import { SpeciesProvinceMap } from "./species-province-map";
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleImageIndexChange = useCallback((index: number) => {
    setCurrentImageIndex(index);
  }, []);

  const currentImage = images[currentImageIndex];

  return (
    <div className="flex gap-6 items-stretch">
      {/* Image gallery or skeleton */}
      <div className="flex-shrink-0 w-[300px] flex flex-col">
        {isLoading ? (
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
        ) : (
          <SpeciesImageGallery
            images={images}
            speciesName={scientificName}
            hideCaption
            onCurrentIndexChange={handleImageIndexChange}
          />
        )}
      </div>

      {/* Text content — centered between panels */}
      <div className="flex-1 space-y-2 flex flex-col justify-center">
        {/* Scientific name with large family icon */}
        <div className="flex items-center gap-4">
          <FamilyIcon family={family} size={72} className="shrink-0" />
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

        {/* Stats line — only show if species has data records */}
        {recordCount > 0 && (
          <div className="flex gap-4 text-sm items-center">
            <span>
              <span className="font-mono font-bold">{recordCount}</span> record
              {recordCount !== 1 ? "s" : ""}
            </span>
            <span>
              <span className="font-mono font-bold">{studyCount}</span> stud
              {studyCount !== 1 ? "ies" : "y"}
            </span>
          </div>
        )}

        {/* Contact email notice */}
        <p className="text-xs italic text-muted-foreground leading-snug mt-1">
          Please send an email to{" "}
          <a href="mailto:eliotruiz3@gmail.com" className="text-primary hover:underline">
            eliotruiz3@gmail.com
          </a>{" "}
          if you are aware of any error or missing records, or if one of the
          images displayed is yours and you would like it to be removed from this website.
        </p>

        {/* Photo credit — below contact email */}
        {currentImage && (
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              Picture source:{' '}
              {currentImage.link ? (
                <a
                  href={currentImage.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {currentImage.displayAuthor}
                </a>
              ) : (
                currentImage.displayAuthor
              )}
            </div>
            <div>
              Identification certainty:{' '}
              {currentImage.uncertain ? (
                <span className="text-red-500 font-medium">Unsure</span>
              ) : (
                <span className="text-green-500 font-medium">Sure</span>
              )}
            </div>
            {currentImage.scale !== undefined && (
              <div
                className="text-xs italic"
                style={{ color: currentImage.scale ? '#00BA38' : '#F8766D' }}
              >
                Specimen length:{' '}
                {currentImage.scale
                  ? 'Specimen size or scale available in the source'
                  : 'Specimen size or scale unavailable in the source'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Species distribution mini-map — same height as picture panel */}
      <div className="flex-shrink-0 w-[300px] flex flex-col">
        <h3 className="text-xs font-semibold text-muted-foreground mb-1 text-center">
          Distribution in Marine Ecoregions (MEOW) and Pelagic Provinces (PPOW)
        </h3>
        <div className="flex-1">
          <SpeciesProvinceMap speciesId={speciesId} />
        </div>
      </div>
    </div>
  );
}
