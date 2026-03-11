"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { useHomepageStats } from "@/hooks/use-homepage-stats";
import { ChevronRight, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-context";

// Lazy load heavy homepage components to reduce initial bundle
const TraitBarplots = lazy(() =>
  import("@/components/homepage/trait-barplots").then((m) => ({ default: m.TraitBarplots }))
);
const PublicationChart = lazy(() =>
  import("@/components/homepage/publication-chart").then((m) => ({ default: m.PublicationChart }))
);
const HomepageSettlementMap = lazy(() =>
  import("@/components/homepage/settlement-map").then((m) => ({ default: m.HomepageSettlementMap }))
);
const HomepageProvinceMap = lazy(() =>
  import("@/components/homepage/homepage-province-map").then((m) => ({ default: m.HomepageProvinceMap }))
);

function HomepageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-muted rounded" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [filteredSpeciesNames, setFilteredSpeciesNames] = useState<Set<string> | null>(null);
  const [mapFilteredSpecies, setMapFilteredSpecies] = useState<Set<string> | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { barplotStats, imageStats, publicationYears, familyPhotos } = useHomepageStats();
  const { t } = useI18n();

  const handleFilteredSpeciesChange = useCallback((names: Set<string> | null) => {
    setFilteredSpeciesNames(names);
  }, []);

  const handleMapFilterSpecies = useCallback((species: Set<string> | null) => {
    setMapFilteredSpecies(species);
  }, []);

  const handleOpenGallery = useCallback(() => {
    router.push('/gallery');
  }, [router]);

  // Height-matching: dynamically scale text font size to match mandala image height
  const textRef = useRef<HTMLDivElement>(null);
  const mandalaRef = useRef<HTMLDivElement>(null);
  const [textScale, setTextScale] = useState(1);

  useEffect(() => {
    function matchHeights() {
      const textEl = textRef.current;
      const mandalaEl = mandalaRef.current;
      if (!textEl || !mandalaEl) return;

      // Only on desktop (lg grid = 2 cols)
      if (window.innerWidth < 1024) {
        setTextScale(1);
        return;
      }

      const mandalaHeight = mandalaEl.offsetHeight;
      if (mandalaHeight <= 0) return;

      // Reset to measure natural text height
      textEl.style.fontSize = '';
      const naturalHeight = textEl.scrollHeight;

      if (naturalHeight <= 0) return;

      const ratio = mandalaHeight / naturalHeight;
      // Don't scale below 0.7 (would make text ~8px which is too small)
      if (ratio < 0.7) {
        setTextScale(1);
      } else {
        setTextScale(Math.min(ratio, 1.2));
      }
    }

    matchHeights();
    window.addEventListener('resize', matchHeights);
    return () => window.removeEventListener('resize', matchHeights);
  }, []);

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={(sp) => { router.push(`/species/${sp.id}`); }} onFilteredSpeciesChange={handleFilteredSpeciesChange} mapFilteredSpecies={mapFilteredSpecies} />}>
      <div className="space-y-6">
        {/* Two-column hero: LEFT text, RIGHT mandala */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT column: title + credits + intro */}
          <div ref={textRef} style={{ fontSize: textScale !== 1 ? `${textScale}em` : undefined }}>
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

          {/* RIGHT column: mandala image with help button */}
          <div className="relative" ref={mandalaRef}>
            <img
              src="/mandala.png"
              alt="Mandala of fish larvae diversity"
              className="w-full rounded-lg"
            />
            <button
              onClick={() => setShowHelp(true)}
              className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              title="How to navigate this website"
            >
              Help
            </button>
          </div>
        </div>

        {/* Gallery preview + button */}
        <div className="space-y-0">
          {/* Preview row of family thumbnails with fade */}
          {familyPhotos.length > 0 && (
            <div
              className="relative overflow-hidden rounded-t-lg cursor-pointer"
              onClick={handleOpenGallery}
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1 p-2 bg-card">
                {familyPhotos.slice(0, 14).map((fam) => (
                  <div key={fam.family} className="relative aspect-[4/3] bg-black rounded overflow-hidden">
                    {fam.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={fam.imageUrl}
                        alt={fam.family}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🐟</div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <span className="text-[9px] text-white truncate block">{fam.family}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Gradient fade at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[hsl(0,0%,5%)] to-transparent pointer-events-none" />
            </div>
          )}

          {/* Gallery button */}
          <button
            onClick={handleOpenGallery}
            className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 rounded-b-lg border border-blue-600 bg-blue-600 hover:bg-blue-700 transition-colors text-left gap-1 sm:gap-0"
          >
            <span className="text-sm font-semibold text-white">
              {t('gallery_button')} ({familyPhotos.length} families)
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-blue-200 font-normal">Click to view images</span>
              <ChevronRight className="h-5 w-5 text-white" />
            </span>
          </button>
        </div>

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

      {/* Help overlay modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowHelp(false)}>
          <div className="relative bg-card border border-border rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-white mb-4">How to Navigate LarvalBase</h2>

            <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
              <div>
                <h3 className="font-semibold text-white mb-1">Search for species</h3>
                <p>Use the search bar in the left sidebar to find species by <strong>scientific (Latin) name</strong> or <strong>common name</strong>. Toggle the checkboxes to search by one or both. Synonym names are also matched automatically.</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1">Filter by dispersal trait availability</h3>
                <p>In the sidebar, check the trait filters to show only species that have data for specific traits (e.g. egg characteristics, settlement size, swimming speed). This narrows the species list and gallery to matching families.</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1">Filter by adult location</h3>
                <p>Click on any region in the interactive world map to filter species by their <strong>biogeographic province</strong>. Selected regions are highlighted and the species list updates in real time. Click again to deselect.</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1">Filter by ecosystem &amp; habitat</h3>
                <p>Use the <strong>Ecosystem</strong> (Marine, Euryhaline, Freshwater) and <strong>Habitat</strong> (Benthic, Pelagic) checkboxes in the sidebar to filter species by their adult ecology.</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1">Browse family galleries</h3>
                <p>Click the blue <strong>&quot;Colored pictures&quot;</strong> button to open the gallery of family thumbnails. Click any family to view all specimen photographs for that family. Galleries include <strong>unsure identifications</strong>, <strong>genus-level</strong>, and <strong>family-level</strong> entries — highlighted with colored borders.</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1">Species detail pages</h3>
                <p>Each species page shows trait data organized by life stage: egg characteristics, hatching size, growth curves, settlement, metamorphosis, swimming abilities, vertical distribution, and more. Section tooltips (?) provide detailed descriptions.</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1">No data? Explore related taxa</h3>
                <p>Even if a trait is <strong>unavailable for a specific species</strong>, you can still view <strong>barplots and summary statistics</strong> from related species in the same genus or family, and <strong>download data from close taxa</strong> via the raw data tables.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
