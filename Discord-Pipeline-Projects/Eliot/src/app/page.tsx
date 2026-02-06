"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SpeciesDetail } from "@/components/species-detail/species-detail";

interface SelectedSpecies {
  id: string;
  scientificName: string;
}

export default function Home() {
  const [selectedSpecies, setSelectedSpecies] = useState<SelectedSpecies | null>(
    null
  );

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={setSelectedSpecies} />}>
      {selectedSpecies ? (
        <SpeciesDetail speciesId={selectedSpecies.id} />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">LarvalBase</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Fish Larvae Trait Database
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-muted-foreground">
              Select a species from the sidebar to view its traits.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Use the search bar, browse the taxonomy tree, or apply trait
              filters.
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
