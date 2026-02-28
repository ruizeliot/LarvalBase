"use client";

import { FolderOpen, Layers, Fish } from "lucide-react";

interface TaxonomyLevelIconProps {
  level: 'root' | 'order' | 'family' | 'genus' | 'species';
  familyName?: string;
  className?: string;
}

/**
 * TaxonomyLevelIcon renders a distinct icon per taxonomic level.
 *
 * Uses Lucide icons with color-coding per level:
 * - Root: Folder icon (muted)
 * - Order: Layers icon (purple)
 * - Family: Fish icon (blue)
 * - Genus: Fish icon (cyan, smaller)
 * - Species: Fish icon (emerald, smallest)
 */
export function TaxonomyLevelIcon({ level, className = '' }: TaxonomyLevelIconProps) {
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
      return (
        <Fish
          data-testid="taxonomy-icon-family"
          className={`h-4 w-4 shrink-0 text-blue-400 ${className}`}
        />
      );

    case 'genus':
      return (
        <Fish
          data-testid="taxonomy-icon-genus"
          className={`h-3.5 w-3.5 shrink-0 text-cyan-400 ${className}`}
        />
      );

    case 'species':
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
