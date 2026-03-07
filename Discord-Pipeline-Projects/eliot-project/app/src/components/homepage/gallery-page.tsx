"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { cleanOrderName } from "@/lib/utils/clean-order-name";
import { HomepageProvinceMap } from "./homepage-province-map";
import type { FamilyPhotoData } from "./photo-grid";

interface GalleryPageProps {
  families: FamilyPhotoData[];
  onBack: () => void;
  onSelectFamily: (family: string) => void;
  onSelectSpecies?: (speciesName: string) => void;
  filteredSpeciesNames?: Set<string> | null;
}

/**
 * Full gallery page showing ALL family thumbnails.
 * Has a province map on top for filtering.
 * No "Show more" button — shows everything.
 */
export function GalleryPage({ families, onBack, onSelectFamily, filteredSpeciesNames }: GalleryPageProps) {
  const [mapFilteredSpecies, setMapFilteredSpecies] = useState<Set<string> | null>(null);

  const handleMapFilter = useCallback((species: Set<string> | null) => {
    setMapFilteredSpecies(species);
  }, []);

  // Filter families based on province map + sidebar trait filter
  const visibleFamilies = useMemo(() => {
    // Combine filters
    let activeFilter: Set<string> | null = null;
    if (filteredSpeciesNames && mapFilteredSpecies) {
      // Intersection
      activeFilter = new Set<string>();
      for (const name of filteredSpeciesNames) {
        if (mapFilteredSpecies.has(name)) activeFilter.add(name);
      }
    } else if (filteredSpeciesNames) {
      activeFilter = filteredSpeciesNames;
    } else if (mapFilteredSpecies) {
      activeFilter = mapFilteredSpecies;
    }

    if (!activeFilter) return families;

    // Show families that have at least one species in the filter
    return families.filter((fam) =>
      fam.species.some((sp) => activeFilter!.has(sp.validName))
    );
  }, [families, filteredSpeciesNames, mapFilteredSpecies]);

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to homepage
      </button>

      <h2 className="text-xl font-bold text-white">
        Colored pictures of post-flexion and early juvenile stages library
        <span className="ml-2 text-base font-normal text-muted-foreground">
          ({visibleFamilies.length} families)
        </span>
      </h2>

      <p className="text-sm text-muted-foreground italic">
        Please send an email to{" "}
        <a href="mailto:eliotruiz3@gmail.com" className="text-blue-400 hover:underline not-italic">
          eliotruiz3@gmail.com
        </a>{" "}
        if you are aware of any identification error or species-level identification for unsure ID, or if one of the images displayed is yours and you would like it to be removed from this website.
      </p>

      {/* Province map for filtering */}
      <HomepageProvinceMap onFilterSpecies={handleMapFilter} />

      {/* All family thumbnails — no pagination */}
      <div className="grid grid-cols-5 gap-2">
        {visibleFamilies.map((fam) => (
          <div
            key={fam.family}
            className="rounded-md border bg-card overflow-hidden cursor-pointer transition-transform hover:scale-[1.03] hover:border-primary"
            onClick={() => onSelectFamily(fam.family)}
          >
            <div className="relative w-full h-32 bg-black flex items-center justify-center text-2xl">
              {fam.imageUrl ? (
                <img
                  src={fam.imageUrl}
                  alt={fam.family}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
              ) : (
                '🐟'
              )}
            </div>
            <div className="p-1.5 relative">
              <div className="text-xs font-semibold text-primary truncate">
                {fam.family}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {cleanOrderName(fam.order)} {fam.imageCount ? `(${fam.imageCount} img)` : ''}
              </div>
              {fam.hasFamilyIcon && (
                <Image
                  src={`/family-icons/${fam.family}.svg`}
                  alt=""
                  width={36}
                  height={36}
                  className="absolute bottom-1 right-1 opacity-70"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  unoptimized
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {visibleFamilies.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No families match the current filters.
        </p>
      )}
    </div>
  );
}
