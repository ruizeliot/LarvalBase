"use client";

import { useState, useCallback, lazy, Suspense } from "react";
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
  const [filteredSpeciesNames, setFilteredSpeciesNames] = useState<Set<string> | null>(null);
  const { barplotStats, imageStats, publicationYears, familyPhotos } = useHomepageStats();

  const handleFilteredSpeciesChange = useCallback((names: Set<string> | null) => {
    setFilteredSpeciesNames(names);
  }, []);

  // Selecting a species from the gallery
  const handleGallerySpeciesSelect = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setSelectedFamily(null);
    setSelectedSpecies({ id: slug, scientificName: name });
  };

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={setSelectedSpecies} onFilteredSpeciesChange={handleFilteredSpeciesChange} />}>
      {selectedSpecies ? (
        <SpeciesDetail speciesId={selectedSpecies.id} />
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
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              LarvalBase: Global pelagic dispersal traits databases for
              early-life stages of marine fishes – Ruiz et al. (2026)
            </h1>
            <p className="text-xs text-muted-foreground leading-snug mt-2">
              To support research on the early life stages of marine fishes, we compiled a comprehensive database of 35 traits (7 qualitative and 28 quantitative) describing developmental, behavioral, and ecological aspects of the pelagic phase. We focused on traits most relevant to pelagic dispersal processes and the parameterization of biophysical dispersal models. The database includes 471 new records on age and size at settlement, including 207 previously unpublished entries and 264 newly acquired during two fieldworks in the Atlantic and Indian Oceans. These fieldworks also allowed obtaining 41 new measurements of swimming performance in situ (see:{" "}
              <a href="https://doi.org/10.1111/2041-210X.70011" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://doi.org/10.1111/2041-210X.70011
              </a>
              ). Behavioral databases were completed by 907 previously unpublished records of larval fish vertical position in the water column. Considered together, dispersal traits datasets comprise 47,132 records across 6,874 marine fish species, representing 1,932 genera, 358 families, and 58 orders, sourced from 3,201 references. LarvalBase was further enriched by an additional 4,046 colored pictures of post-flexion and early juveniles of 919 species obtained from 100 sources. Growth rate models curves from 47 original references and 90 populations are also now newly displayed, along with age-at-length data. If one of the images displayed is yours and you would like it to be removed from this website, or if you found any missing record or an error Do not hesitate to signal errors, copyright problems or missing records by sending an email to{" "}
              <a href="mailto:eliotruiz3@gmail.com" className="text-primary hover:underline">
                eliotruiz3@gmail.com
              </a>
              . Please cite both the original reference and our data paper, which describes in further detail this new database and method, if you use any part of our database:{" "}
              <a href="https://github.com/ruizeliot/fish_larvae_traits_db" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://github.com/ruizeliot/fish_larvae_traits_db
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Editor &amp; Manager: Eliot Ruiz<br />
              Developer: Anthony Hunt
            </p>
          </div>

          {/* Mandala image */}
          <div className="space-y-2">
            <img
              src="/mandala.png"
              alt="Mandala of fish larvae diversity"
              className="w-full rounded-lg"
            />
            <p className="text-xs text-muted-foreground leading-snug">
              This mandala provides a brief overview of the great taxonomical (22 out of &gt;300 species) and morphological diversity of fishes during or shortly after metamorphosis sampled in two different oceans. Here are names from species represented, belonging to 15 different families, by columns (top to bottom from left to right): <em>Bryx dunckeri</em> (Guadeloupe), <em>Petroscirtes mitratus</em> (Maldives), <em>Parapercis hexophtalma</em> (Maldives), <em>Abudefduf vaigiensis</em> (Maldives), <em>Chaetodon striatus</em> (Guadeloupe), <em>Cirrhilabrus exquisitus</em> (Maldives), <em>Pomacentrus pavo</em> (Maldives), <em>Scarus rubroviolaceus</em> (Maldives), <em>Halichoeres hortulanus</em> (Maldives), <em>Paraluteres prionurus</em> (Maldives), <em>Conger conger</em> (Mediterranean Sea), <em>Bothus ocellatus</em> (Guadeloupe), <em>Enneapterygius abeli</em> (Maldives), <em>Scorpaena plumieri</em> (Guadeloupe), <em>Acanthostracion quadricornis</em> (Guadeloupe), <em>Ophichthus cylindroideus</em> (Guadeloupe), <em>Macropharyngodon bipartitus</em> (Maldives), <em>Monacanthus ciliatus</em> (Guadeloupe), <em>Chromis viridis</em> (Maldives), <em>Stegastes bipartitus</em> (Guadeloupe), <em>Halichoeres leucoxanthus</em> (Maldives), <em>Canthidermis maculata</em> (Guadeloupe). Some fish also come with their parasites such as cnidarian polyps (<em>Larsonia</em>/<em>Hydrichthys</em> sp.) on <em>Chaetodon striatus</em> or blood-sucking crustaceans (<em>Caligus</em> sp.) on <em>Canthidermis maculata</em>.
            </p>
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
