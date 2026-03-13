"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
        {/* Title row: icon + title + help button */}
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/larvalbase-icon-3.png"
            alt="LarvalBase icon"
            width={200}
            height={200}
            className="h-44 sm:h-52 w-auto shrink-0"
            priority
          />
          <h1 className="text-2xl font-bold leading-tight text-center">
            LarvalBase – A global pelagic dispersal traits 🐟 databases<br />for early-life stages of marine fishes 🐟
          </h1>
          <button
            onClick={() => setShowHelp(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors shrink-0"
            title="How to navigate this website"
          >
            Help
          </button>
        </div>

        {/* Two-column hero: LEFT text, RIGHT mandala */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT column: credits + intro text */}
          <div ref={textRef} style={{ fontSize: textScale !== 1 ? `${textScale}em` : undefined }}>
            <p className="text-lg font-bold">
              {t('homepage_credits')}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed mt-3 text-justify">
              {t('homepage_description_1')}
              <a href="https://doi.org/10.1111/2041-210X.70011" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://doi.org/10.1111/2041-210X.70011
              </a>
              {t('homepage_description_2')}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed mt-3 text-justify">
              {t('homepage_description_3')}
            </p>
          </div>

          {/* RIGHT column: mandala image */}
          <div ref={mandalaRef}>
            <Image
              src="/mandala.png"
              alt="Mandala of fish larvae diversity"
              width={800}
              height={800}
              className="w-full rounded-lg"
              priority
            />
          </div>
        </div>

        {/* Citation row: full width below both text and mandala */}
        <p className="text-sm text-gray-300 leading-relaxed text-justify">
          <strong>Please cite our data paper, which describes in further detail how this dataset was acquired, if you use any part of our database:</strong><br />
          <em>Ruiz, E., Th&eacute;m&egrave;ze-Leroy, M., Ferraton, F., Panfili, J., Durand, J.-D., Kulbicki, M., Silhol, J., Bernard, A., Thomas, R., Morisson, T., Djouldem, Y., Baptiste, E., Pascal, P.-Y., Vanalderweireldt, L., Cordonnier, S., Chatagnon, A., Rault, P.-L., Leon, L., Leone, I., Fouchan, Y., Victor, B., Albouy-Boyer, S., Le Berre, T., Dromard, C. R., Pellissier, L., Albouy, C., &amp; Leprieur, F. (2026). Global pelagic dispersal traits databases for early-life stages of marine fishes. Scientific Data.{' '}
          <a href="https://github.com/ruizeliot/fish_larvae_traits_db" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            https://github.com/ruizeliot/fish_larvae_traits_db
          </a></em>
        </p>

        {/* Gallery preview + button */}
        <div className="space-y-0">
          {/* Preview row of family thumbnails with fade */}
          {familyPhotos.length > 0 && (
            <div
              className="relative overflow-hidden rounded-t-lg cursor-pointer"
              onClick={handleOpenGallery}
            >
              <div className="grid grid-cols-5 gap-1 p-2 bg-card">
                {familyPhotos.slice(0, 10).map((fam) => (
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

        {/* Affiliations section */}
        <div className="pt-4">
          <h2 className="text-lg font-semibold text-white mb-4 border-b border-border pb-2">Affiliations</h2>
          <div className="space-y-3">
            {/* Row 1: MARBEC, IRD, ETHZ, Reefscapers — exactly one line, no wrapping */}
            <div className="flex items-center justify-center gap-2 sm:gap-6 flex-nowrap overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-marbec.webp" alt="MARBEC" style={{ height: 'clamp(24px, 4vw, 48px)' }} className="w-auto object-contain shrink-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-ird.png" alt="IRD" style={{ height: 'clamp(24px, 4vw, 48px)' }} className="w-auto object-contain shrink-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-ethz.png" alt="ETH Zürich" style={{ height: 'clamp(24px, 4vw, 48px)' }} className="w-auto object-contain shrink-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-reefscapers.png" alt="Reefscapers" style={{ height: 'clamp(24px, 4vw, 48px)' }} className="w-auto object-contain shrink-0" />
            </div>
            {/* Row 2: UM, MNHN, UA — centered, approximately twice the height of row 1 */}
            <div className="flex items-center justify-center gap-3 sm:gap-8 flex-nowrap overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-um.png" alt="Université de Montpellier" style={{ height: 'clamp(48px, 8vw, 96px)' }} className="w-auto object-contain shrink-0 max-w-[30%]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mnhn.png" alt="MNHN" style={{ height: 'clamp(48px, 8vw, 96px)' }} className="w-auto object-contain shrink-0 max-w-[30%]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-ua.png" alt="Université des Antilles" style={{ height: 'clamp(48px, 8vw, 96px)' }} className="w-auto object-contain shrink-0 max-w-[30%]" />
            </div>
          </div>
        </div>
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

              <div>
                <h3 className="font-semibold text-white mb-1">Downloading data</h3>
                <p>LarvalBase offers multiple ways to export trait data:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>Per species</strong>: On each species page, click the blue &quot;Export all traits&quot; button to download a table containing all available trait data for that species.</li>
                  <li><strong>Per species and per trait</strong>: On each species page, click the &quot;Species&quot; button on the top-right corner of each trait section to download all traits included in this section for that species. You can also download data of close taxa by clicking on the &quot;Genus&quot;, &quot;Family&quot; and &quot;Order&quot; buttons next to it.</li>
                  <li><strong>Per family</strong>: On each family page, click the blue export button to download trait data for all species in that family, optionally filtered by biogeographic province.</li>
                  <li><strong>Per biogeographic province</strong>: On the gallery page, select a province on the map and click the export button to download trait data for all species present in that province. If no province is selected, data for all species worldwide is exported.</li>
                  <li><strong>Per trait and province</strong>: Click on any trait name in the &quot;Taxa per trait&quot; barplot on the homepage to access a dedicated trait page. Each trait page shows a map of species coverage per province and allows downloading the original database file filtered for species present in the selected province.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
