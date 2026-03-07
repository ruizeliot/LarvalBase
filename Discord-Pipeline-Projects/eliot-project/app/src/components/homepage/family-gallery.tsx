"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { ProvinceMap } from "@/components/province-map/province-map";

interface GalleryImage {
  imageUrl: string;
  species: string | null;
  genus: string | null;
  author: string;
  uncertain: boolean;
  level: "species" | "genus" | "family";
}

interface SpeciesSubsection {
  speciesName: string;
  images: GalleryImage[];
}

interface GenusSection {
  genusName: string;
  genusImages: GalleryImage[];
  speciesSubsections: SpeciesSubsection[];
}

interface GalleryData {
  family: string;
  genusSections: GenusSection[];
  familyImages: GalleryImage[];
}

interface FamilyGalleryProps {
  family: string;
  onBack: () => void;
  onSelectSpecies?: (speciesName: string) => void;
  /** When not null, only show species in this set (genus/family images always visible). */
  filteredSpeciesNames?: Set<string> | null;
}

/**
 * Full gallery page for a family.
 * Structure per genus:
 *   - Genus header (blue #619CFF)
 *   - Genus-level images (if any)
 *   - Species subsections (green #00BA38) with "See dispersal traits" link
 * Family-level images at bottom (red #F8766D)
 * No names below pictures.
 */
export function FamilyGallery({ family, onBack, onSelectSpecies, filteredSpeciesNames }: FamilyGalleryProps) {
  const [data, setData] = useState<GalleryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<Set<string> | null>(null);
  const [selectedProvinces, setSelectedProvinces] = useState<Set<string> | null>(null);
  const [provinceListExpanded, setProvinceListExpanded] = useState(false);
  const [provinceApiData, setProvinceApiData] = useState<Record<string, { count: number; species: string[] }> | null>(null);
  const [genusProvinces, setGenusProvinces] = useState<Record<string, string[]> | null>(null);

  // Compute set of species names that have images
  const speciesWithImageNames = useMemo((): Set<string> | null => {
    if (!data) return null;
    const names = new Set<string>();
    for (const genus of (data.genusSections ?? [])) {
      for (const sp of genus.speciesSubsections) {
        if (sp.images.length > 0) {
          names.add(sp.speciesName);
        }
      }
    }
    return names;
  }, [data]);

  // Combine sidebar trait filter and province map filter
  const combinedFilter = useMemo((): Set<string> | null => {
    if (!filteredSpeciesNames && !provinceFilter) return null;
    if (filteredSpeciesNames && !provinceFilter) return filteredSpeciesNames;
    if (!filteredSpeciesNames && provinceFilter) return provinceFilter;
    // Both active: intersection
    const result = new Set<string>();
    for (const name of filteredSpeciesNames!) {
      if (provinceFilter!.has(name)) result.add(name);
    }
    return result;
  }, [filteredSpeciesNames, provinceFilter]);

  // Determine which genera are present in selected provinces
  const genusFilter = useMemo((): Set<string> | null => {
    if (!selectedProvinces || selectedProvinces.size === 0 || !genusProvinces) return null;
    const allowedGenera = new Set<string>();
    for (const [genus, provinces] of Object.entries(genusProvinces)) {
      for (const prov of provinces) {
        if (selectedProvinces.has(prov)) {
          allowedGenera.add(genus);
          break;
        }
      }
    }
    return allowedGenera;
  }, [selectedProvinces, genusProvinces]);

  // Filter species subsections when sidebar trait filters or province filter are active
  const filteredData = useMemo((): GalleryData | null => {
    if (!data) return null;
    // No filter active → show everything
    if (!combinedFilter && !genusFilter) return data;
    // Filter genus sections by genus province presence + species by combinedFilter
    const genusSections = (data.genusSections ?? [])
      .filter((genus) => {
        // If genus filter active, hide genera not in selected provinces
        if (genusFilter && !genusFilter.has(genus.genusName)) return false;
        return true;
      })
      .map((genus) => ({
        ...genus,
        speciesSubsections: combinedFilter
          ? genus.speciesSubsections.filter((sp) => combinedFilter.has(sp.speciesName))
          : genus.speciesSubsections,
      }))
      // Keep genus section if it has genus-level images OR remaining species
      .filter((genus) => genus.genusImages.length > 0 || genus.speciesSubsections.length > 0);
    return { ...data, genusSections };
  }, [data, combinedFilter, genusFilter]);

  // Flatten all images for lightbox navigation + compute index map (uses filtered data)
  const { allImages, indexMap } = useMemo(() => {
    const all: GalleryImage[] = [];
    // indexMap: key → startIndex in allImages
    const map = new Map<string, number>();

    if (filteredData) {
      for (const genus of (filteredData.genusSections ?? [])) {
        if (genus.genusImages.length > 0) {
          map.set(`genus:${genus.genusName}`, all.length);
          all.push(...genus.genusImages);
        }
        for (const sp of genus.speciesSubsections) {
          map.set(`species:${genus.genusName}:${sp.speciesName}`, all.length);
          all.push(...sp.images);
        }
      }
      if ((filteredData.familyImages ?? []).length > 0) {
        map.set('family', all.length);
        all.push(...filteredData.familyImages);
      }
    }
    return { allImages: all, indexMap: map };
  }, [filteredData]);

  useEffect(() => {
    // Scroll to top when entering the gallery
    window.scrollTo({ top: 0 });
    setSelectedProvinces(null);
    setProvinceListExpanded(false);

    async function loadGallery() {
      try {
        const res = await fetch(`/api/families/${encodeURIComponent(family)}/gallery`);
        if (!res.ok) throw new Error("Failed to load gallery");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Gallery load error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadGallery();

    // Also fetch province data for the sidebar filter
    fetch(`/api/families/${encodeURIComponent(family)}/provinces`)
      .then(r => r.json())
      .then((json: { provinces: Record<string, { count: number; species: string[] }> }) => {
        setProvinceApiData(json.provinces ?? null);
      })
      .catch(console.error);

    // Fetch genus-level province data for genus filtering
    fetch(`/api/families/${encodeURIComponent(family)}/genus-provinces`)
      .then(r => r.json())
      .then((json: { genera: Record<string, string[]> }) => {
        setGenusProvinces(json.genera ?? null);
      })
      .catch(console.error);
  }, [family]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight" && lightboxIndex < allImages.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      } else if (e.key === "ArrowLeft" && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    },
    [lightboxIndex, allImages.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to homepage
        </button>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !filteredData) return null;

  return (
    <div data-testid="family-gallery" className="p-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to homepage
      </button>

      {/* Family title */}
      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
        <Image
          src={`/family-icons/${family}.svg`}
          alt={`${family} silhouette`}
          width={32}
          height={22}
          className="object-contain shrink-0"
          style={{ filter: 'brightness(0) invert(1)' }}
          unoptimized
        />
        {family} — Photo Gallery
      </h2>

      {/* Contact text for identification errors */}
      <p className="text-sm text-muted-foreground italic">
        Please send an email to{" "}
        <a href="mailto:eliotruiz3@gmail.com" className="text-blue-400 hover:underline not-italic">
          eliotruiz3@gmail.com
        </a>{" "}
        if you are aware of any identification error or species-level identification for unsure ID, or if one of the images displayed is yours and you would like it to be removed from this website.
      </p>

      {/* Province distribution map */}
      <ProvinceMap
        family={family}
        onFilterSpecies={setProvinceFilter}
        speciesWithImages={speciesWithImageNames}
        onSelectedProvincesChange={setSelectedProvinces}
        externalSelectedProvinces={selectedProvinces}
      />

      {/* Biogeographic province filter */}
      {provinceApiData && Object.keys(provinceApiData).length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card/30 p-3">
          <button
            className="flex items-center justify-between w-full text-sm font-semibold text-white"
            onClick={() => setProvinceListExpanded(!provinceListExpanded)}
          >
            <span>Biogeographic province {selectedProvinces && selectedProvinces.size > 0 ? `(${selectedProvinces.size} selected)` : ''}</span>
            <span className="text-muted-foreground text-xs">{provinceListExpanded ? '▲' : '▼'}</span>
          </button>
          {provinceListExpanded && (
            <div className="mt-2 space-y-0.5 max-h-60 overflow-y-auto">
              {selectedProvinces && selectedProvinces.size > 0 && (
                <button
                  className="text-xs text-blue-400 hover:text-blue-300 mb-1"
                  onClick={() => {
                    setSelectedProvinces(null);
                    setProvinceFilter(null);
                  }}
                >
                  Clear all
                </button>
              )}
              {Object.entries(provinceApiData)
                .filter(([, d]) => d.count > 0)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, pData]) => {
                  const isChecked = selectedProvinces?.has(name) ?? false;
                  const imgCount = speciesWithImageNames
                    ? pData.species.filter(s => speciesWithImageNames.has(s)).length
                    : null;
                  return (
                    <label
                      key={name}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-white/5 ${isChecked ? 'bg-white/10' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = new Set(selectedProvinces ?? []);
                          if (next.has(name)) {
                            next.delete(name);
                          } else {
                            next.add(name);
                          }
                          const result = next.size > 0 ? next : null;
                          setSelectedProvinces(result);
                          // Compute species filter from selected provinces
                          if (result) {
                            const allSpecies = new Set<string>();
                            for (const pName of result) {
                              const pd = provinceApiData[pName];
                              if (pd) pd.species.forEach(s => allSpecies.add(s));
                            }
                            setProvinceFilter(allSpecies.size > 0 ? allSpecies : null);
                          } else {
                            setProvinceFilter(null);
                          }
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-white/90 flex-1">{name}</span>
                      <span className="text-white/50">
                        {pData.count} spp{imgCount !== null ? `, ${imgCount} img` : ''}
                      </span>
                    </label>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {(filteredData.genusSections ?? []).length === 0 && (filteredData.familyImages ?? []).length === 0 && (
        <p className="text-muted-foreground">No photos available for this family.</p>
      )}

      {/* Genus sections */}
      {(filteredData.genusSections ?? []).map((genus) => (
        <div key={genus.genusName} className="space-y-3 rounded-lg border border-border/50 bg-card/30 p-4">
          {/* Genus header */}
          <h3 className="text-base font-semibold italic border-b border-border pb-1 text-white">
            {genus.genusName}
          </h3>

          {/* Genus-level images */}
          {genus.genusImages.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Genus-level identifications
              </p>
              <ImageGrid
                images={genus.genusImages}
                startIndex={indexMap.get(`genus:${genus.genusName}`) ?? 0}
                onClickImage={setLightboxIndex}
              />
            </div>
          )}

          {/* Species subsections */}
          {genus.speciesSubsections.map((sp) => (
            <div key={sp.speciesName} className="space-y-1.5">
              <div>
                <h4 className="text-sm font-semibold italic text-white">
                  {sp.speciesName}
                </h4>
                <button
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  onClick={() => {
                    window.scrollTo({ top: 0 });
                    onSelectSpecies?.(sp.speciesName);
                  }}
                >
                  See dispersal traits →
                </button>
              </div>
              <ImageGrid
                images={sp.images}
                startIndex={indexMap.get(`species:${genus.genusName}:${sp.speciesName}`) ?? 0}
                onClickImage={setLightboxIndex}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Family-level images at bottom */}
      {(filteredData.familyImages ?? []).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold border-b border-border pb-1 text-white">
            {family} — Family-level identifications
          </h3>
          <ImageGrid
            images={filteredData.familyImages}
            startIndex={indexMap.get('family') ?? 0}
            onClickImage={setLightboxIndex}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && allImages[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-8 w-8" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          <div
            className="max-w-[85vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allImages[lightboxIndex].imageUrl}
              alt={allImages[lightboxIndex].species || family}
              className="max-w-full max-h-[75vh] object-contain"
            />
            <div className="mt-2 text-white text-center">
              <p className="text-sm text-white/60">
                {allImages[lightboxIndex].author}
                {allImages[lightboxIndex].uncertain ? " (Unsure ID)" : " (Sure ID)"}
              </p>
              <p className="text-xs text-white/40">
                {lightboxIndex + 1} / {allImages.length}
              </p>
            </div>
          </div>

          {lightboxIndex < allImages.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple image grid — 5 columns, no names below pictures.
 */
function ImageGrid({
  images,
  startIndex,
  onClickImage,
}: {
  images: GalleryImage[];
  startIndex: number;
  onClickImage: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {images.map((img, i) => (
        <div
          key={`${img.imageUrl}-${i}`}
          className={`rounded-md border bg-card overflow-hidden cursor-pointer transition-transform hover:scale-[1.03]${
            img.uncertain ? " border-2 border-[#F8766D]" : ""
          }`}
          title={img.uncertain ? "Unsure ID" : undefined}
          onClick={() => onClickImage(startIndex + i)}
        >
          <div className="w-full h-28 bg-black">
            <img
              src={img.imageUrl}
              alt={img.species || img.genus || ""}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
