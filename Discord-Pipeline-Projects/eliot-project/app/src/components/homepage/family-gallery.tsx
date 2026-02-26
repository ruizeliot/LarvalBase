"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";

interface GalleryImage {
  imageUrl: string;
  species: string | null;
  genus: string | null;
  author: string;
  uncertain: boolean;
  level: "species" | "genus" | "family";
}

interface GallerySection {
  genus: string;
  images: GalleryImage[];
}

interface FamilyGalleryProps {
  family: string;
  onBack: () => void;
  onSelectSpecies?: (speciesName: string) => void;
}

/**
 * Full gallery page for a family.
 * Shows genus/species/family-level photos organized by genus sections.
 * Includes lightbox with prev/next navigation.
 */
export function FamilyGallery({ family, onBack, onSelectSpecies }: FamilyGalleryProps) {
  const [sections, setSections] = useState<GallerySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Flatten all images for lightbox navigation
  const allImages = sections.flatMap((s) => s.images);

  useEffect(() => {
    async function loadGallery() {
      try {
        const res = await fetch(`/api/families/${encodeURIComponent(family)}/gallery`);
        if (!res.ok) throw new Error("Failed to load gallery");
        const data = await res.json();
        setSections(data.sections ?? []);
      } catch (error) {
        console.error("Gallery load error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadGallery();
  }, [family]);

  // Lightbox keyboard navigation
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

  // Compute global image index for lightbox from section/image indices
  function getGlobalIndex(sectionIdx: number, imageIdx: number): number {
    let idx = 0;
    for (let s = 0; s < sectionIdx; s++) {
      idx += sections[s].images.length;
    }
    return idx + imageIdx;
  }

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

  return (
    <div data-testid="family-gallery" className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to homepage
      </button>

      <h2 className="text-xl font-bold text-primary">{family} — Photo Gallery</h2>

      {sections.length === 0 && (
        <p className="text-muted-foreground">No photos available for this family.</p>
      )}

      {/* Genus sections */}
      {sections.map((section, sectionIdx) => (
        <div key={section.genus} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground italic">
            {section.genus}
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {section.images.map((img, imgIdx) => (
              <div
                key={`${img.imageUrl}-${imgIdx}`}
                className="rounded-md border bg-card overflow-hidden cursor-pointer transition-transform hover:scale-[1.03]"
                onClick={() => setLightboxIndex(getGlobalIndex(sectionIdx, imgIdx))}
              >
                <div className="w-full h-28 bg-muted">
                  <img
                    src={img.imageUrl}
                    alt={img.species || img.genus || family}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                {img.species && (
                  <div className="p-1">
                    <button
                      className="text-xs text-primary italic hover:underline truncate block w-full text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpecies?.(img.species!);
                      }}
                    >
                      {img.species}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Lightbox */}
      {lightboxIndex !== null && allImages[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Prev arrow */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Image */}
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
              {allImages[lightboxIndex].species && (
                <p className="italic">{allImages[lightboxIndex].species}</p>
              )}
              <p className="text-sm text-white/60">
                {allImages[lightboxIndex].author}
                {allImages[lightboxIndex].uncertain && " (uncertain ID)"}
              </p>
              <p className="text-xs text-white/40">
                {lightboxIndex + 1} / {allImages.length}
              </p>
            </div>
          </div>

          {/* Next arrow */}
          {lightboxIndex < allImages.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
