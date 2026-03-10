"use client";

import { useRouter } from "next/navigation";
import { lazy, Suspense, useCallback, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { useHomepageStats } from "@/hooks/use-homepage-stats";

const GalleryPage = lazy(() =>
  import("@/components/homepage/gallery-page").then((m) => ({ default: m.GalleryPage }))
);

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-muted rounded" />
    </div>
  );
}

export default function GalleryRoute() {
  const router = useRouter();
  const { familyPhotos } = useHomepageStats();
  const [mapFilteredSpecies, setMapFilteredSpecies] = useState<Set<string> | null>(null);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleSelectFamily = useCallback((family: string) => {
    router.push(`/families/${encodeURIComponent(family)}`);
  }, [router]);

  const handleSelectSpecies = useCallback((name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    router.push(`/species/${slug}`);
  }, [router]);

  const handleSidebarSelectSpecies = useCallback(
    (species: { id: string; scientificName: string }) => {
      router.push(`/species/${species.id}`);
    },
    [router]
  );

  const handleMapFilterSpecies = useCallback((species: Set<string> | null) => {
    setMapFilteredSpecies(species);
  }, []);

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={handleSidebarSelectSpecies} mapFilteredSpecies={mapFilteredSpecies} />}>
      <Suspense fallback={<LoadingSkeleton />}>
        <GalleryPage
          families={familyPhotos}
          onBack={handleBack}
          onSelectFamily={handleSelectFamily}
          onSelectSpecies={handleSelectSpecies}
          filteredSpeciesNames={null}
          onMapFilterSpecies={handleMapFilterSpecies}
        />
      </Suspense>
    </MainLayout>
  );
}
