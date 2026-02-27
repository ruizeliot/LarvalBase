"use client";

import { useState } from "react";
import { FolderOpen, Layers, Fish } from "lucide-react";

interface TaxonomyLevelIconProps {
  level: 'root' | 'order' | 'family' | 'genus' | 'species';
  familyName?: string;
  className?: string;
}

/**
 * SVG family silhouette icon (shared between family/genus/species when familyName known).
 */
function FamilySilhouetteIcon({ family, size, className = '' }: { family: string; size: number; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return <span className={`inline-block rounded-full bg-amber-400/40 shrink-0 ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/family-icons/${family}.svg`}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ filter: 'brightness(0) invert(1)' }}
      onError={() => setErr(true)}
    />
  );
}

/**
 * TaxonomyLevelIcon renders a distinct SVG icon per taxonomic level.
 *
 * Implements US-3.2: SVG icons in taxonomy sidebar for each taxonomic level.
 * - Root: Folder icon
 * - Order: Layers/diamond icon (purple)
 * - Family: Fish silhouette (or generic family icon when no familyName)
 * - Genus: Fish silhouette (slightly smaller)
 * - Species: Fish silhouette (smallest)
 */
export function TaxonomyLevelIcon({ level, familyName, className = '' }: TaxonomyLevelIconProps) {
  switch (level) {
    case 'root':
      return (
        <FolderOpen
          data-testid="taxonomy-icon-root"
          className={`h-4 w-4 shrink-0 text-muted-foreground ${className}`}
        />
      );

    case 'order':
      return (
        <Layers
          data-testid="taxonomy-icon-order"
          className={`h-4 w-4 shrink-0 text-purple-400 ${className}`}
        />
      );

    case 'family':
      if (familyName) {
        return <FamilySilhouetteIcon family={familyName} size={16} className={className} />;
      }
      return (
        <Fish
          data-testid="taxonomy-icon-family"
          className={`h-4 w-4 shrink-0 text-blue-400 ${className}`}
        />
      );

    case 'genus':
      if (familyName) {
        return <FamilySilhouetteIcon family={familyName} size={14} className={className} />;
      }
      return (
        <Fish
          data-testid="taxonomy-icon-genus"
          className={`h-3.5 w-3.5 shrink-0 text-cyan-400 ${className}`}
        />
      );

    case 'species':
      if (familyName) {
        return <FamilySilhouetteIcon family={familyName} size={12} className={className} />;
      }
      return (
        <Fish
          data-testid="taxonomy-icon-species"
          className={`h-3 w-3 shrink-0 text-emerald-400 ${className}`}
        />
      );

    default:
      return null;
  }
}
