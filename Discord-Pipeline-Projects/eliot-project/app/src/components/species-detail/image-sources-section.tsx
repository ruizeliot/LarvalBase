"use client";

import type { SpeciesImage } from "@/lib/types/image.types";

interface ImageSourcesSectionProps {
  images: SpeciesImage[];
}

/**
 * Image Sources section — displays author + link for each species image.
 * Shows after References on the species detail page.
 */
export function ImageSourcesSection({ images }: ImageSourcesSectionProps) {
  if (images.length === 0) return null;

  // Deduplicate by author+link combination
  const seen = new Set<string>();
  const uniqueImages = images.filter((img) => {
    // Normalize author by trimming and collapsing whitespace for dedup
    const author = (img.displayAuthor || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const link = (img.link || '').trim().toLowerCase();
    const key = `${author}|${link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 56, height: 56, backgroundColor: "#F5F5F5" }}
          title="Image sources"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image-icon.svg"
            alt="Image sources icon"
            width={36}
            height={36}
            style={{ filter: 'brightness(0)' }}
          />
        </div>
        <h2 className="text-lg font-semibold">Image sources</h2>
      </div>

      <ul className="space-y-2">
        {uniqueImages.map((img, index) => (
          <li key={index} className="text-sm">
            <span>
              {img.displayAuthor}
              {img.link && (
                <>
                  {" — "}
                  <a
                    href={img.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Link
                  </a>
                </>
              )}
              {!img.link && (
                <>
                  {" — "}
                  <span className="text-muted-foreground">Link</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
