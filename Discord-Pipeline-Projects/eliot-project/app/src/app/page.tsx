"use client";

import { useState, useCallback, lazy, Suspense } from "react";
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
const FamilyGallery = lazy(() =>
  import("@/components/homepage/family-gallery").then((m) => ({ default: m.FamilyGallery }))
);
const HomepageSettlementMap = lazy(() =>
  import("@/components/homepage/settlement-map").then((m) => ({ default: m.HomepageSettlementMap }))
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
  // Track where user came from when viewing a species (for back button)
  const [cameFromFamily, setCameFromFamily] = useState<string | null>(null);
  const [filteredSpeciesNames, setFilteredSpeciesNames] = useState<Set<string> | null>(null);
  const { barplotStats, imageStats, publicationYears, familyPhotos } = useHomepageStats();

  const handleFilteredSpeciesChange = useCallback((names: Set<string> | null) => {
    setFilteredSpeciesNames(names);
  }, []);

  // Selecting a species from the gallery
  const handleGallerySpeciesSelect = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setCameFromFamily(selectedFamily);
    setSelectedFamily(null);
    setSelectedSpecies({ id: slug, scientificName: name });
  };

  // Back handler for species detail page
  const handleSpeciesBack = useCallback(() => {
    if (cameFromFamily) {
      setSelectedSpecies(null);
      setSelectedFamily(cameFromFamily);
      setCameFromFamily(null);
    } else {
      setSelectedSpecies(null);
      setCameFromFamily(null);
    }
    window.scrollTo({ top: 0 });
  }, [cameFromFamily]);

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={(sp) => { setCameFromFamily(null); setSelectedSpecies(sp); }} onFilteredSpeciesChange={handleFilteredSpeciesChange} />}>
      {selectedSpecies ? (
        <SpeciesDetail
          speciesId={selectedSpecies.id}
          onBack={handleSpeciesBack}
          backLabel={cameFromFamily ? `Back to family gallery` : `Back to homepage`}
        />
      ) : selectedFamily ? (
        <Suspense fallback={<HomepageSkeleton />}>
          <FamilyGallery
            family={selectedFamily}
            onBack={() => setSelectedFamily(null)}
            onSelectSpecies={handleGallerySpeciesSelect}
            filteredSpeciesNames={filteredSpeciesNames}
          />
        </Suspense>
      ) : (
        <div className="space-y-6">
          {/* Two-column hero: LEFT text, RIGHT mandala */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT column: title + credits + intro */}
            <div>
              <h1 className="text-2xl font-bold leading-tight">
                LarvalBase: Global pelagic dispersal traits databases for
                early-life stages of marine fishes – Ruiz et al. (2026)
              </h1>
              <p className="text-base font-bold mt-2">
                Editor &amp; Manager: Eliot Ruiz / Developer: Anthony Hunt
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                To support research on the early life stages of marine fishes, we compiled a comprehensive database of 35 traits (7 qualitative and 28 quantitative) describing developmental, behavioral, and ecological aspects of the pelagic phase. We focused on traits most relevant to pelagic dispersal processes and the parameterization of biophysical dispersal models. The database includes 471 new records on age and size at settlement, including 207 previously unpublished entries and 264 newly acquired during two fieldworks in the Atlantic and Indian Oceans. These fieldworks also allowed obtaining 41 new measurements of swimming performance in situ (see:{" "}
                <a href="https://doi.org/10.1111/2041-210X.70011" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  https://doi.org/10.1111/2041-210X.70011
                </a>
                ). Behavioral databases were completed by 907 previously unpublished records of larval fish vertical position in the water column. Considered together, dispersal traits datasets comprise 47,132 records across 6,874 marine fish species, representing 1,932 genera, 358 families, and 58 orders, sourced from 3,201 references.
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                LarvalBase was further enriched by an additional 9,357 colored pictures of post-flexion and early juveniles of 1,929 species obtained from 100 sources. Growth rate models curves from 47 original references and 90 populations are also now newly displayed, along with age-at-length data.
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                Please cite both the original reference and our data paper, which describes in further detail this new database and method, if you use any part of our database:{" "}
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

          <Suspense fallback={<HomepageSkeleton />}>
            <PublicationChart data={publicationYears} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <TraitBarplots stats={barplotStats} imageStats={imageStats} />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <HomepageSettlementMap />
          </Suspense>
          <Suspense fallback={<HomepageSkeleton />}>
            <PhotoGrid
              families={familyPhotos}
              onSelectFamily={setSelectedFamily}
              onSelectSpecies={(name) => {
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setCameFromFamily(null);
                setSelectedSpecies({ id: slug, scientificName: name });
              }}
            />
          </Suspense>

        </div>
      )}
    </MainLayout>
  );
}
