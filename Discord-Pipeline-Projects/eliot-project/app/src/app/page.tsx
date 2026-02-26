"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SpeciesDetail } from "@/components/species-detail/species-detail";
import { TraitBarplots } from "@/components/homepage/trait-barplots";
import { PublicationChart } from "@/components/homepage/publication-chart";
import { PhotoGrid } from "@/components/homepage/photo-grid";
import { useHomepageStats } from "@/hooks/use-homepage-stats";

interface SelectedSpecies {
  id: string;
  scientificName: string;
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

          <TraitBarplots stats={barplotStats} />
          <PublicationChart data={publicationYears} />
          <PhotoGrid
            families={familyPhotos}
            onSelectSpecies={(name) => {
              // Convert species name to selection format
              const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              setSelectedSpecies({ id: slug, scientificName: name });
            }}
          />
        </div>
      )}
    </MainLayout>
  );
}
