"use client";

import { useParams, useRouter } from "next/navigation";
import { lazy, Suspense, useCallback, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";

const FamilyGallery = lazy(() =>
  import("@/components/homepage/family-gallery").then((m) => ({ default: m.FamilyGallery }))
);

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-muted rounded" />
    </div>
  );
}

export default function FamilyPage() {
  const params = useParams();
  const router = useRouter();
  const familyName = decodeURIComponent(params.name as string);
  const [mapFilteredSpecies, setMapFilteredSpecies] = useState<Set<string> | null>(null);

  const handleSelectSpecies = useCallback(
    (speciesName: string) => {
      const slug = speciesName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      router.push(`/species/${slug}`);
    },
    [router]
  );

  const handleBack = useCallback(() => {
    router.push('/gallery');
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
        <FamilyGallery
          family={familyName}
          onBack={handleBack}
          onSelectSpecies={handleSelectSpecies}
          filteredSpeciesNames={null}
          backLabel="Back to gallery"
          onMapFilterSpecies={handleMapFilterSpecies}
        />
      </Suspense>
    </MainLayout>
  );
}
