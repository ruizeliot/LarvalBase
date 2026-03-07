"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SpeciesDetail } from "@/components/species-detail/species-detail";
import { useHomepageStats } from "@/hooks/use-homepage-stats";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSelector } from "@/components/navigation/language-selector";

// Lazy load heavy homepage components to reduce initial bundle
const TraitBarplots = lazy(() =>
  import("@/components/homepage/trait-barplots").then((m) => ({ default: m.TraitBarplots }))
);
const PublicationChart = lazy(() =>
  import("@/components/homepage/publication-chart").then((m) => ({ default: m.PublicationChart }))
);
const FamilyGallery = lazy(() =>
  import("@/components/homepage/family-gallery").then((m) => ({ default: m.FamilyGallery }))
);
const HomepageSettlementMap = lazy(() =>
  import("@/components/homepage/settlement-map").then((m) => ({ default: m.HomepageSettlementMap }))
);
const HomepageProvinceMap = lazy(() =>
  import("@/components/homepage/homepage-province-map").then((m) => ({ default: m.HomepageProvinceMap }))
);
const GalleryPage = lazy(() =>
  import("@/components/homepage/gallery-page").then((m) => ({ default: m.GalleryPage }))
);

interface SelectedSpecies {
  id: string;
  scientificName: string;
}

type ViewMode = 'homepage' | 'species' | 'family-gallery' | 'all-gallery';

function HomepageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-muted rounded" />
    </div>
  );
}

export default function Home() {
  const [selectedSpecies, setSelectedSpecies] = useState<SelectedSpecies | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('homepage');
  // Track where user came from when viewing a species (for back button)
  const [cameFromFamily, setCameFromFamily] = useState<string | null>(null);
  const [cameFromGallery, setCameFromGallery] = useState(false);
  const [filteredSpeciesNames, setFilteredSpeciesNames] = useState<Set<string> | null>(null);
  const [mapFilteredSpecies, setMapFilteredSpecies] = useState<Set<string> | null>(null);
  const { barplotStats, imageStats, publicationYears, familyPhotos } = useHomepageStats();
  const { t } = useI18n();

  const handleFilteredSpeciesChange = useCallback((names: Set<string> | null) => {
    setFilteredSpeciesNames(names);
  }, []);

  const handleMapFilterSpecies = useCallback((species: Set<string> | null) => {
    setMapFilteredSpecies(species);
  }, []);

  // Selecting a species from the gallery
  const handleGallerySpeciesSelect = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setCameFromFamily(selectedFamily);
    setCameFromGallery(viewMode === 'all-gallery');
    setSelectedFamily(null);
    setMapFilteredSpecies(null);
    setViewMode('species');
    setSelectedSpecies({ id: slug, scientificName: name });
  };

  // Back handler for species detail page
  const handleSpeciesBack = useCallback(() => {
    setSelectedSpecies(null);
    if (cameFromFamily) {
      setSelectedFamily(cameFromFamily);
      setViewMode('family-gallery');
      setCameFromFamily(null);
    } else if (cameFromGallery) {
      setViewMode('all-gallery');
      setCameFromGallery(false);
    } else {
      setViewMode('homepage');
    }
    setCameFromFamily(null);
    window.scrollTo({ top: 0 });
  }, [cameFromFamily, cameFromGallery]);

  // Navigate to gallery page
  const handleOpenGallery = useCallback(() => {
    setViewMode('all-gallery');
    window.scrollTo({ top: 0 });
  }, []);

  // Navigate from gallery page to family detail
  const handleGallerySelectFamily = useCallback((family: string) => {
    setCameFromGallery(true);
    setSelectedFamily(family);
    setViewMode('family-gallery');
  }, []);

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={(sp) => { setCameFromFamily(null); setCameFromGallery(false); setViewMode('species'); setSelectedSpecies(sp); }} onFilteredSpeciesChange={handleFilteredSpeciesChange} mapFilteredSpecies={mapFilteredSpecies} />}>
      {viewMode === 'species' && selectedSpecies ? (
        <SpeciesDetail
          speciesId={selectedSpecies.id}
          onBack={handleSpeciesBack}
          backLabel={cameFromFamily ? `${t('back_to_family_gallery')} (${cameFromFamily})` : cameFromGallery ? t('back_to_gallery') : t('back_to_homepage')}
        />
      ) : viewMode === 'family-gallery' && selectedFamily ? (
        <Suspense fallback={<HomepageSkeleton />}>
          <FamilyGallery
            family={selectedFamily}
            onBack={() => {
              setSelectedFamily(null);
              setMapFilteredSpecies(null);
              if (cameFromGallery) {
                setViewMode('all-gallery');
              } else {
                setViewMode('homepage');
              }
              setCameFromGallery(false);
            }}
            onSelectSpecies={handleGallerySpeciesSelect}
            filteredSpeciesNames={filteredSpeciesNames}
            backLabel={cameFromGallery ? t('back_to_family_gallery') : t('back_to_homepage')}
            onMapFilterSpecies={handleMapFilterSpecies}
          />
        </Suspense>
      ) : viewMode === 'all-gallery' ? (
        <Suspense fallback={<HomepageSkeleton />}>
          <GalleryPage
            families={familyPhotos}
            onBack={() => { setViewMode('homepage'); setMapFilteredSpecies(null); window.scrollTo({ top: 0 }); }}
            onSelectFamily={handleGallerySelectFamily}
            onSelectSpecies={handleGallerySpeciesSelect}
            filteredSpeciesNames={filteredSpeciesNames}
            onMapFilterSpecies={handleMapFilterSpecies}
          />
        </Suspense>
      ) : (
        <div className="space-y-6">
          {/* Language selector */}
          <div className="flex justify-end">
            <LanguageSelector />
          </div>

          {/* Two-column hero: LEFT text, RIGHT mandala */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT column: title + credits + intro */}
            <div>
              <h1 className="text-2xl font-bold leading-tight">
                {t('homepage_title')}
              </h1>
              <p className="text-base font-bold mt-2">
                {t('homepage_credits')}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                {t('homepage_description_1')}
                <a href="https://doi.org/10.1111/2041-210X.70011" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1111/2041-210X.70011
                </a>
                {t('homepage_description_2')}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                {t('homepage_description_3')}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                {t('homepage_cite')}
                <a href="https://github.com/ruizeliot/fish_larvae_traits_db" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  https://github.com/ruizeliot/fish_larvae_traits_db
                </a>
              </p>
            </div>

            {/* RIGHT column: mandala image */}
            <div>
              <img
                src="/mandala.png"
                alt="Mandala of fish larvae diversity"
                className="w-full rounded-lg"
              />
            </div>
          </div>

          {/* Gallery button ABOVE the map */}
          <button
            onClick={handleOpenGallery}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-blue-600 bg-blue-600 hover:bg-blue-700 transition-colors text-left"
          >
            <span className="text-sm font-semibold text-white">
              {t('gallery_button')} ({familyPhotos.length} families)
            </span>
            <ChevronRight className="h-5 w-5 text-white shrink-0" />
          </button>

          {/* Province map */}
          <Suspense fallback={<HomepageSkeleton />}>
            <HomepageProvinceMap onFilterSpecies={handleMapFilterSpecies} />
          </Suspense>

          <Suspense fallback={<HomepageSkeleton />}>
            <PublicationChart data={publicationYears} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <TraitBarplots stats={barplotStats} imageStats={imageStats} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <HomepageSettlementMap />
          </Suspense>
        </div>
      )}
    </MainLayout>
  );
}
