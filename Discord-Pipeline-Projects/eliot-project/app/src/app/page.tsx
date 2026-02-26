"use client";

import { useState, lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SpeciesDetail } from "@/components/species-detail/species-detail";
import { useHomepageStats } from "@/hooks/use-homepage-stats";

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
  const [selectedSpecies, setSelectedSpecies] = useState<SelectedSpecies | null>(
    null
  );
  const { barplotStats, publicationYears, familyPhotos } = useHomepageStats();

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={setSelectedSpecies} />}>
      {selectedSpecies ? (
        <SpeciesDetail speciesId={selectedSpecies.id} />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              LarvalBase: Global pelagic dispersal traits databases for
              early-life stages of marine fishes – Ruiz et al. (2026)
            </h1>
          </div>

          <Suspense fallback={<HomepageSkeleton />}>
            <TraitBarplots stats={barplotStats} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <PublicationChart data={publicationYears} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <PhotoGrid
              families={familyPhotos}
              onSelectSpecies={(name) => {
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setSelectedSpecies({ id: slug, scientificName: name });
              }}
            />
          </Suspense>
        </div>
      )}
    </MainLayout>
  );
}
