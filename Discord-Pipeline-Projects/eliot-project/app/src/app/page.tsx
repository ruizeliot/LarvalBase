"use client";

import { useState, lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SpeciesDetail } from "@/components/species-detail/species-detail";
import { useHomepageStats } from "@/hooks/use-homepage-stats";
import { SpeciesListExport } from "@/components/homepage/species-list-export";

// Lazy load heavy homepage components to reduce initial bundle
const TraitBarplots = lazy(() =>
  import("@/components/homepage/trait-barplots").then((m) => ({ default: m.TraitBarplots }))
);
const PublicationChart = lazy(() =>
  import("@/components/homepage/publication-chart").then((m) => ({ default: m.PublicationChart }))
);
const PhotoGrid = lazy(() =>
  import("@/components/homepage/photo-grid").then((m) => ({ default: m.PhotoGrid }))
);
const FamilyGallery = lazy(() =>
  import("@/components/homepage/family-gallery").then((m) => ({ default: m.FamilyGallery }))
);

interface SelectedSpecies {
  id: string;
  scientificName: string;
}

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
  const { barplotStats, publicationYears, familyPhotos } = useHomepageStats();

  // Selecting a species from the gallery
  const handleGallerySpeciesSelect = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setSelectedFamily(null);
    setSelectedSpecies({ id: slug, scientificName: name });
  };

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={setSelectedSpecies} />}>
      {selectedSpecies ? (
        <SpeciesDetail speciesId={selectedSpecies.id} />
      ) : selectedFamily ? (
        <Suspense fallback={<HomepageSkeleton />}>
          <FamilyGallery
            family={selectedFamily}
            onBack={() => setSelectedFamily(null)}
            onSelectSpecies={handleGallerySpeciesSelect}
          />
        </Suspense>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              LarvalBase: Global pelagic dispersal traits databases for
              early-life stages of marine fishes – Ruiz et al. (2026)
            </h1>
            <p className="text-xs italic text-muted-foreground leading-snug mt-2">
              Please send an email to{" "}
              <a href="mailto:eliotruiz3@gmail.com" className="text-primary hover:underline">
                eliotruiz3@gmail.com
              </a>{" "}
              if you are aware of any missing records on this website, or if one of the
              images displayed is yours and you would like it to be removed from this website.
            </p>
          </div>

          <Suspense fallback={<HomepageSkeleton />}>
            <PublicationChart data={publicationYears} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <TraitBarplots stats={barplotStats} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <PhotoGrid
              families={familyPhotos}
              onSelectFamily={setSelectedFamily}
              onSelectSpecies={(name) => {
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setSelectedSpecies({ id: slug, scientificName: name });
              }}
            />
          </Suspense>

          {/* Export Species List button */}
          <div className="flex justify-center pt-4">
            <SpeciesListExport />
          </div>
        </div>
      )}
    </MainLayout>
  );
}
