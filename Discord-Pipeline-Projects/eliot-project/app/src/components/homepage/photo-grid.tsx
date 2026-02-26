"use client";

import { useState } from "react";

/**
 * Photo grid showing one image per family, sorted by order.
 * Click a family card to drill down to genus/species modal.
 */

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
}

export function PhotoGrid({ families, onSelectSpecies }: PhotoGridProps) {
  const [selectedFamily, setSelectedFamily] = useState<FamilyPhotoData | null>(null);

  if (families.length === 0) return null;

  return (
    <div data-testid="photo-grid" className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Colored pictures of post-flexion and early juvenile stages library
      </h3>

      {/* Grid: 5 per row */}
      <div className="grid grid-cols-5 gap-2">
        {families.map((fam) => (
          <div
            key={fam.family}
            data-testid="photo-card"
            className="rounded-md border bg-card overflow-hidden cursor-pointer transition-transform hover:scale-[1.03] hover:border-primary"
            onClick={() => setSelectedFamily(fam)}
          >
            {/* Image placeholder or actual image */}
            <div className="w-full h-20 bg-muted flex items-center justify-center text-2xl">
              {fam.imageUrl ? (
                <img
                  src={fam.imageUrl}
                  alt={fam.family}
                  className="w-full h-full object-cover"
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

      {/* Drill-down modal */}
      {selectedFamily && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setSelectedFamily(null)}
        >
          <div
            className="rounded-lg border bg-card p-6 max-w-lg w-[90%] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">
                {selectedFamily.family} — Species in database
              </h3>
              <button
                className="text-muted-foreground hover:text-foreground text-xl"
                onClick={() => setSelectedFamily(null)}
              >
                ×
              </button>
            </div>
            <div className="space-y-1">
              {selectedFamily.species.map((sp) => (
                <div
                  key={sp.validName}
                  className="text-sm text-muted-foreground italic py-1 px-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => {
                    onSelectSpecies?.(sp.validName);
                    setSelectedFamily(null);
                  }}
                >
                  {sp.validName} — {sp.records} records
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
