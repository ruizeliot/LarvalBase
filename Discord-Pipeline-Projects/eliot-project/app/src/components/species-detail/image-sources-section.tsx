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
        {images.map((img, index) => (
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
