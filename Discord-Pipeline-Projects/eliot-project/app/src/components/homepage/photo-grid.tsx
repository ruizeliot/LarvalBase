"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

/**
 * Photo grid showing one image per family, sorted by most images.
 * Click a family card to navigate to a full gallery page.
 * Paginated: shows PAGE_SIZE families initially with "Show more" button.
 */

const PAGE_SIZE = 50;

export interface FamilyPhotoData {
  family: string;
  order: string;
  imageUrl: string | null;
  imageCount?: number;
  hasFamilyIcon?: boolean;
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
              <div className="text-xs font-semibold text-primary truncate flex items-center gap-1">
                {fam.hasFamilyIcon && (
                  <Image
                    src={`/family-icons/${fam.family}.svg`}
                    alt=""
                    width={14}
                    height={14}
                    className="shrink-0"
                    style={{ filter: 'invert(1) brightness(0.8)', opacity: 0.85 }}
                  />
                )}
                {fam.family}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {fam.order} {fam.imageCount ? `(${fam.imageCount} img)` : ''}
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
