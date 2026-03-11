"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { cleanOrderName } from "@/lib/utils/clean-order-name";
import { getProvinceDisplayName } from "@/lib/constants/provinces";
import { HomepageProvinceMap } from "./homepage-province-map";
import type { FamilyPhotoData } from "./photo-grid";

interface GalleryPageProps {
  families: FamilyPhotoData[];
  onBack: () => void;
  onSelectFamily: (family: string) => void;
  onSelectSpecies?: (speciesName: string) => void;
  filteredSpeciesNames?: Set<string> | null;
  /** Notify parent of map-based species filtering (for sidebar sync) */
  onMapFilterSpecies?: (species: Set<string> | null) => void;
}

/**
 * Full gallery page showing ALL family thumbnails.
 * Has a province map on top for filtering.
 * No "Show more" button — shows everything.
 */
export function GalleryPage({ families, onBack, onSelectFamily, filteredSpeciesNames, onMapFilterSpecies }: GalleryPageProps) {
  const [mapFilteredSpecies, setMapFilteredSpecies] = useState<Set<string> | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleMapFilter = useCallback((species: Set<string> | null) => {
    setMapFilteredSpecies(species);
    onMapFilterSpecies?.(species);
  }, [onMapFilterSpecies]);

  const handleSelectedProvinceChange = useCallback((province: string | null) => {
    setSelectedProvince(province);
  }, []);

  const handleProvinceExport = useCallback(async () => {
    if (!selectedProvince) return;
    setIsExporting(true);
    try {
      const url = `/api/export/province-traits?province=${encodeURIComponent(selectedProvince)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const safeName = selectedProvince.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
      a.download = `${safeName}_all_traits.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Province export error:', e);
    } finally {
      setIsExporting(false);
    }
  }, [selectedProvince]);

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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to homepage
      </button>

      <h2 className="text-lg md:text-xl font-bold text-white">
        Colored pictures of post-flexion and early juvenile stages library
        <span className="ml-1 md:ml-2 text-sm md:text-base font-normal text-muted-foreground">
          ({visibleFamilies.length} families)
        </span>
      </h2>

      {/* Province map for filtering — families mode */}
      <HomepageProvinceMap onFilterSpecies={handleMapFilter} mode="families" onSelectedProvinceChange={handleSelectedProvinceChange} />

      {/* Export all traits for selected province */}
      <div className="flex justify-center">
        <button
          onClick={handleProvinceExport}
          disabled={!selectedProvince || isExporting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded transition-colors"
          title={selectedProvince ? `Export traits for species in ${getProvinceDisplayName(selectedProvince)}` : 'Select a province first'}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {selectedProvince
            ? `Export all traits (without metadata) for all species in ${getProvinceDisplayName(selectedProvince)}`
            : 'Export all traits (without metadata) for all species in the selected area'}
        </button>
      </div>

      {/* All family thumbnails — no pagination */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
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
                  draggable={false}
                />
              ) : (
                '🐟'
              )}
            </div>
            <div className="p-1.5 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-primary truncate">
                  {fam.family}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {cleanOrderName(fam.order)} {fam.imageCount ? `(${fam.imageCount} img)` : ''}
                </div>
              </div>
              {fam.hasFamilyIcon && (
                <Image
                  src={`/family-icons/${fam.family}.svg`}
                  alt=""
                  width={36}
                  height={36}
                  className="shrink-0 ml-1 opacity-70"
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
