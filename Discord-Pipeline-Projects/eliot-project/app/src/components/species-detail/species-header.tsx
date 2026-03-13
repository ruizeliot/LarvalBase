"use client";

import { useState, useCallback, useEffect } from "react";
import { SpeciesImageGallery } from "./species-image-gallery";
import { SpeciesProvinceMap } from "./species-province-map";
import { FamilyIcon } from "./family-icon";
import { useSpeciesImages } from "@/hooks/use-species-images";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanOrderName } from "@/lib/utils/clean-order-name";
import { useI18n } from "@/lib/i18n/i18n-context";

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
  /** Habitat info to render below the province map source line */
  habitatInfo?: { habitat: string | null; ecosystem: string | null } | null;
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
  habitatInfo,
}: SpeciesHeaderProps) {
  const { images, isLoading } = useSpeciesImages(speciesId);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commonNames, setCommonNames] = useState<string[]>([]);
  const { t, commonNamesLang } = useI18n();

  // Fetch common names in current language
  useEffect(() => {
    if (!speciesId) return;
    fetch(`/api/species/${encodeURIComponent(speciesId)}/common-names?lang=${encodeURIComponent(commonNamesLang)}`)
      .then(r => r.json())
      .then(data => setCommonNames(data.names || []))
      .catch(() => setCommonNames([]));
  }, [speciesId, commonNamesLang]);

  const handleImageIndexChange = useCallback((index: number) => {
    setCurrentImageIndex(index);
  }, []);

  const currentImage = images[currentImageIndex];

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
      {/* Image gallery or skeleton */}
      <div className="flex-shrink-0 w-full md:w-[300px] flex flex-col">
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
      <div className="flex-1 space-y-2 flex flex-col justify-center min-w-0">
        {/* Scientific name with large family icon */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="shrink-0 hidden sm:flex items-center">
            <FamilyIcon family={family} size={72} />
          </div>
          <div className="shrink-0 sm:hidden flex items-center">
            <FamilyIcon family={family} size={48} />
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl md:text-[28px] font-semibold italic break-words">{scientificName}</h1>
            {/* Taxonomy line */}
            <div className="text-muted-foreground text-sm md:text-base">
              <span>{family}</span>
              <span className="mx-2">|</span>
              <span>{cleanOrderName(order)}</span>
            </div>
          </div>
        </div>

        {/* Common names row — only show if names available */}
        {commonNames.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{t('common_name')}:</span>{' '}
            {commonNames.join(', ')}
          </div>
        )}

        {/* Stats line — only show if species has data records */}
        {recordCount > 0 && (
          <div className="flex gap-4 text-sm items-center">
            <span>
              <span className="font-mono font-bold">{recordCount}</span>{' '}
              {recordCount !== 1 ? t('records') : t('record')}
            </span>
            <span>
              <span className="font-mono font-bold">{studyCount}</span>{' '}
              {studyCount !== 1 ? t('studies') : t('study')}
            </span>
          </div>
        )}

        {/* Contact email notice */}
        <p className="text-xs italic text-muted-foreground leading-snug mt-1">
          {t('contact_email').split('{email}')[0]}
          <a href="mailto:eliotruiz3@gmail.com" className="text-primary hover:underline">
            eliotruiz3@gmail.com
          </a>
          {t('contact_email').split('{email}')[1]}
        </p>

        {/* Photo credit — below contact email */}
        {currentImage && (
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              {t('picture_source')}:{' '}
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
              {t('identification_certainty')}:{' '}
              {currentImage.uncertain ? (
                <span className="text-red-500 font-medium">{t('unsure')}</span>
              ) : (
                <span className="text-green-500 font-medium">{t('sure')}</span>
              )}
            </div>
            {currentImage.scale !== undefined && (
              <div className="text-sm text-muted-foreground">
                {t('specimen_length')}:{' '}
                <span className="font-medium" style={{ color: currentImage.scale ? '#00BA38' : '#F8766D' }}>
                  {currentImage.scale
                    ? t('size_scale_available')
                    : t('size_scale_unavailable')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Species distribution mini-map — same height as picture panel */}
      <div className="flex-shrink-0 w-full md:w-[300px] flex flex-col">
        <h3 className="text-xs font-semibold text-muted-foreground mb-1 text-center">
          {t('distribution_title')}
        </h3>
        <div className="flex-1">
          <SpeciesProvinceMap speciesId={speciesId} />
        </div>
        {/* Adult Ecosystem & Habitat — directly below the province map Source line */}
        {habitatInfo && (habitatInfo.ecosystem || habitatInfo.habitat) && (
          <div className="mt-1 space-y-0.5 text-sm text-white">
            {habitatInfo.ecosystem && (
              <div>Adult ecosystem: <span className="font-medium">{habitatInfo.ecosystem === 'Freshwater' ? 'Freshwater (marine larvae)' : habitatInfo.ecosystem}</span></div>
            )}
            {habitatInfo.habitat && (
              <div>Adult habitat:{' '}
                <span className="font-medium">
                  {habitatInfo.habitat}
                </span>
                {(habitatInfo.habitat === 'Pelagic' || habitatInfo.habitat === 'Pelagic (offshore)') && (
                  <span className="text-xs italic text-muted-foreground ml-1">- settlement and pelagic juvenile sections not showed</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
