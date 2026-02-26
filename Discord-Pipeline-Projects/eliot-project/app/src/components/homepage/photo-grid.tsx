"use client";

/**
 * Photo grid showing one image per family, sorted by order.
 * Click a family card to navigate to a full gallery page.
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
  onSelectFamily?: (family: string) => void;
}

export function PhotoGrid({ families, onSelectFamily }: PhotoGridProps) {
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
            onClick={() => onSelectFamily?.(fam.family)}
          >
            {/* Image placeholder or actual image */}
            <div className="w-full h-20 bg-muted flex items-center justify-center text-2xl">
              {fam.imageUrl ? (
                <img
                  src={fam.imageUrl}
                  alt={fam.family}
                  loading="lazy"
                  decoding="async"
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
    </div>
  );
}
