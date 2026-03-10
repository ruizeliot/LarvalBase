/**
 * Types for species image metadata and registry.
 *
 * Image metadata comes from sp_ids_pics_metadata.txt with @ delimiter.
 * Images are sorted by author priority for display.
 */

import { z } from 'zod';

/**
 * Blackwater photographer authors — highest priority for thumbnails and display.
 */
export const BLACKWATER_AUTHORS = new Set([
  'Baensch (2026) - Website',
  'Bartick (2026) - Instagram page',
  'Besson (2026) - Instagram page',
  'Collins (2026) - Instagram page',
  'DeLoach (2026) - Instagram page',
  'Gug (2026) - Instagram page',
  'Ianiello (2026) - Website',
  'Jensen (2026) - Instagram page',
  'Kovacs (2026) - Instagram page',
  'Mazda (2026) - Instagram page',
  'Mears (2026) - Website',
  'Meldonian (2026) - Website',
  'Millisen (2026) - Instagram page',
  'Minemizu (2026) - Instagram page',
  'Valencia (2026) - Instagram page',
  'Various authors (2026) - Blackwater Facebook group',
  'Whitestone (2026) - Instagram page',
  'Zhang F. (2026) - Instagram page',
  'Zhang J. (2026) - Instagram page',
  'BW Cozumel (2026) - Instagram page',
]);

/**
 * Secondary authors — second priority after blackwater.
 * Includes Literature/BOLD and specific research authors.
 */
export const SECONDARY_AUTHORS = new Set([
  'Collet et al. (2015) - BOLD project',
  'Jaonalison et al. (2018) - BOLD project',
  'Jaonalison et al. (2015) - BOLD project',
  'CLIP-OI (2020) - SWIO ID key',
  'Collet et al. (2013) - Book',
  'Baldwin (2013) - Zoological Journal of the Linnean Society',
  'Johnson et al. (2025) - Journal of the Ocean Science Foundation',
  'Baldwin et al. (2009) - Zootaxa',
  'Baldwin et al. (2011) - Zootaxa',
  // Also match em-dash variants
  'Baldwin et al. (2009) – Zootaxa',
  'Baldwin et al. (2011) – Zootaxa',
]);

/** @deprecated Use SECONDARY_AUTHORS instead */
export const LITERATURE_AUTHORS = SECONDARY_AUTHORS;

/**
 * Tertiary authors — third priority after secondary.
 */
export const TERTIARY_AUTHORS = new Set([
  'Chatagnon & Aimar (2015) - Book',
  'Chatagnon & Aimar (2015) – Book',
  'Current study (ADLIFISH 1)',
  'Current Study',
  'Current study (IchthyoGwada)',
]);

/**
 * Author priority order for species page image sorting.
 * Lower number = higher priority (displayed first).
 * Within each tier, certain (uncertain=false) images come before uncertain.
 */
export function getAuthorTier(author: string): number {
  if (BLACKWATER_AUTHORS.has(author)) return 1;
  if (SECONDARY_AUTHORS.has(author)) return 2;
  if (TERTIARY_AUTHORS.has(author)) return 3;
  return 4;
}

/**
 * Schema for parsing image metadata CSV rows.
 * Supports both old format (with row-number prefix) and new VPS format.
 * New VPS format columns: ORDER, FAMILY, GENUS, VALID_NAME, ORIGINAL_NAME, UNCERTAIN, SCALE, AUTHOR, PATH, FILE_NAME, LINK
 */
export const ImageMetadataSchema = z.object({
  // Row number column (header is empty string "") — old format only
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
  // New columns
  ORIGINAL_NAME: z.string().optional(),
  SCALE: z
    .union([z.literal('TRUE'), z.literal('FALSE'), z.string()])
    .transform((v) => v === 'TRUE')
    .optional(),
  LINK: z.string().optional(),
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
  /** Human-readable source description for captions */
  sourceDescription: string;
  /** Computed priority tier (1=blackwater, 2=literature, 3=other) */
  priority: number;
  /** Full species name (VALID_NAME) */
  speciesName: string;
  /** Taxonomic family */
  family: string;
  /** Taxonomic order */
  order: string;
  /** Whether scale/specimen size is available in source */
  scale?: boolean;
  /** URL link for the author/source */
  link?: string;
  /** Mean border brightness (0-255, lower = darker background). Used as sort tiebreaker. */
  brightness: number;
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
 * Get author priority tier (lower = higher priority).
 */
export function getAuthorPriority(author: string): number {
  return getAuthorTier(author);
}
