"use client";

import { useState, useCallback } from "react";

/**
 * Photo grid showing one image per family, sorted by order.
 * Click a family card to navigate to a full gallery page.
 * Paginated: shows PAGE_SIZE families initially with "Show more" button.
 */

const PAGE_SIZE = 50;

export interface FamilyPhotoData {
  family: string;
  order: string;
  imageUrl: string | null;
  species: {
    validName: string;
    genus: string;
    records: number;
  }[];
}

interface PhotoGridProps {
  families: FamilyPhotoData[];
  onSelectSpecies?: (speciesName: string) => void;
  onSelectFamily?: (family: string) => void;
}

export function PhotoGrid({ families, onSelectFamily }: PhotoGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const showMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, families.length));
  }, [families.length]);

  if (families.length === 0) return null;

  const visibleFamilies = families.slice(0, visibleCount);
  const hasMore = visibleCount < families.length;

  return (
    <div data-testid="photo-grid" className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Colored pictures of post-flexion and early juvenile stages library
        <span className="ml-2 text-xs font-normal">({families.length} families)</span>
      </h3>

      {/* Grid: 5 per row */}
      <div className="grid grid-cols-5 gap-2">
        {visibleFamilies.map((fam) => (
          <div
            key={fam.family}
            data-testid="photo-card"
            className="rounded-md border bg-card overflow-hidden cursor-pointer transition-transform hover:scale-[1.03] hover:border-primary"
            onClick={() => onSelectFamily?.(fam.family)}
          >
            {/* Image with letterbox/pillarbox (contain + black bg) */}
            <div className="w-full h-20 bg-black flex items-center justify-center text-2xl">
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
            <div className="p-1.5">
              <div className="text-xs font-semibold text-primary truncate">
                {fam.family}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {fam.order}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show more button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={showMore}
            className="px-4 py-2 text-sm rounded-md border bg-card hover:bg-accent transition-colors"
          >
            Show more ({families.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
