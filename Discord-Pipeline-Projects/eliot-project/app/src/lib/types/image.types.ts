/**
 * Types for species image metadata and registry.
 *
 * Image metadata comes from sp_ids_pics_metadata.txt with @ delimiter.
 * Images are sorted by author priority for display.
 */

import { z } from 'zod';

/**
 * Author priority order per IMG-02 requirement.
 * Lower number = higher priority (displayed first).
 */
export const AUTHOR_PRIORITY: Record<string, number> = {
  'Blackwater': 1,
  'Ocea Consult - IHSM': 2,
  'IchthyoGwada': 3,
  'ADLIFISH 1': 4,
  'CRIOBE': 5,
  'Pham & Durand, 2017': 6,
  'Amelia Chatagnon': 7,
  'Fisher et al. 2022': 8,
};

/** Default priority for unknown authors */
export const DEFAULT_PRIORITY = 99;

/**
 * Schema for parsing image metadata CSV rows.
 * Note: First column is row number (unnamed empty string key), second is AUTHOR.
 * The actual CSV header starts with "" for the row number column.
 */
export const ImageMetadataSchema = z.object({
  // Row number column (header is empty string "")
  '': z.string().optional(),
  AUTHOR: z.string(),
  UNCERTAIN: z
    .union([z.literal('TRUE'), z.literal('FALSE'), z.string()])
    .transform((v) => v === 'TRUE'),
  ORDER: z.string(),
  FAMILY: z.string(),
  GENUS: z.string(),
  VALID_NAME: z.string(),
  PATH: z.string(),
  FILE_NAME: z.string(),
});

export type ImageMetadataRow = z.infer<typeof ImageMetadataSchema>;

/**
 * Processed species image with computed priority.
 */
export interface SpeciesImage {
  /** Author/photographer name (raw from metadata) */
  author: string;
  /** Display name for photographer (parsed from filename for Blackwater) */
  displayAuthor: string;
  /** Whether identification is uncertain */
  uncertain: boolean;
  /** Relative path within images/ folder (e.g., "classified_bw_images_species") */
  path: string;
  /** Image filename */
  filename: string;
  /** Computed priority (lower = more preferred) */
  priority: number;
  /** Full species name (VALID_NAME) */
  speciesName: string;
  /** Taxonomic family */
  family: string;
  /** Taxonomic order */
  order: string;
}

/**
 * Extract photographer name from Blackwater filename.
 * Format: "Sure ID - Species Name - species name - Photographer Name - image.jpg"
 * The photographer is at position 4 (0-indexed: 3) between " - " separators.
 */
export function extractBlackwaterPhotographer(filename: string): string {
  const parts = filename.split(' - ');
  if (parts.length >= 4) {
    return parts[3];
  }
  return 'Blackwater';
}

/**
 * Registry for species images and family icons.
 */
export interface ImageRegistry {
  /** Map of VALID_NAME to sorted image array (sorted by priority) */
  imagesBySpecies: Map<string, SpeciesImage[]>;
  /** Set of family names that have SVG icons */
  familiesWithIcons: Set<string>;
  /** Map of order to array of families (for order icon selection) */
  familiesByOrder: Map<string, string[]>;
  /** Total image count */
  imageCount: number;
  /** Load timestamp */
  loadedAt: Date;
}

/**
 * Get author priority (lower = higher priority).
 * Unknown authors get DEFAULT_PRIORITY (99).
 */
export function getAuthorPriority(author: string): number {
  return AUTHOR_PRIORITY[author] ?? DEFAULT_PRIORITY;
}
