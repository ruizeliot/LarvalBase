/**
 * Image registry for loading and organizing species images.
 *
 * Loads image metadata from sp_ids_pics_metadata.txt and scans
 * public/family-icons/ for family silhouette SVGs.
 */

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import {
  ImageMetadataSchema,
  getAuthorPriority,
  extractBlackwaterPhotographer,
  type ImageRegistry,
  type SpeciesImage,
} from '@/lib/types/image.types';

/** Cached registry instance */
let registryCache: ImageRegistry | null = null;

/**
 * Get path to images directory.
 */
function getImagesDir(): string {
  return path.join(process.cwd(), 'images');
}

/**
 * Get path to family SVG directory.
 */
function getFamilySvgDir(): string {
  return path.join(process.cwd(), 'public', 'family-icons');
}

/**
 * Load and parse image metadata CSV.
 * Uses @ delimiter per project convention.
 */
async function loadImageMetadata(): Promise<Map<string, SpeciesImage[]>> {
  const metadataPath = path.join(getImagesDir(), 'sp_ids_pics_metadata.txt');
  const content = await fs.readFile(metadataPath, 'utf-8');

  const imagesBySpecies = new Map<string, SpeciesImage[]>();

  Papa.parse(content, {
    delimiter: '@',
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      try {
        const parsed = ImageMetadataSchema.parse(result.data);

        // Extract relative path from full path (remove "images/" prefix)
        const relativePath = parsed.PATH.replace(/^images\//, '');

        // Get display author - parse from filename for Blackwater images
        const displayAuthor = parsed.AUTHOR === 'Blackwater'
          ? extractBlackwaterPhotographer(parsed.FILE_NAME)
          : parsed.AUTHOR;

        const image: SpeciesImage = {
          author: parsed.AUTHOR,
          displayAuthor,
          uncertain: parsed.UNCERTAIN,
          path: relativePath,
          filename: parsed.FILE_NAME,
          priority: getAuthorPriority(parsed.AUTHOR),
          speciesName: parsed.VALID_NAME,
          family: parsed.FAMILY,
          order: parsed.ORDER,
        };

        // Add to species map
        const existing = imagesBySpecies.get(parsed.VALID_NAME) ?? [];
        existing.push(image);
        imagesBySpecies.set(parsed.VALID_NAME, existing);
      } catch (error) {
        // Skip invalid rows, log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[image-registry] Invalid row:', error);
        }
      }
    },
  });

  // Sort each species' images by priority (ascending = highest priority first)
  for (const [species, images] of imagesBySpecies) {
    images.sort((a, b) => a.priority - b.priority);
    imagesBySpecies.set(species, images);
  }

  console.log(
    `[image-registry] Loaded ${imagesBySpecies.size} species with images`
  );
  return imagesBySpecies;
}

/**
 * Scan family SVG directory and build family icon set.
 * Also builds order-to-families map for order icon selection.
 */
async function loadFamilyIcons(
  imagesBySpecies: Map<string, SpeciesImage[]>
): Promise<{
  familiesWithIcons: Set<string>;
  familiesByOrder: Map<string, string[]>;
}> {
  const svgDir = getFamilySvgDir();
  const familiesWithIcons = new Set<string>();
  const familiesByOrder = new Map<string, string[]>();

  try {
    const files = await fs.readdir(svgDir);
    for (const file of files) {
      if (file.endsWith('.svg')) {
        // Extract family name from filename (e.g., "Acanthuridae.svg" -> "Acanthuridae")
        const family = file.replace('.svg', '');
        familiesWithIcons.add(family);
      }
    }
    console.log(`[image-registry] Found ${familiesWithIcons.size} family SVGs`);
  } catch (error) {
    console.warn('[image-registry] Could not read family SVG directory:', error);
  }

  // Build order -> families map from image metadata
  for (const images of imagesBySpecies.values()) {
    if (images.length > 0) {
      const { order, family } = images[0];
      if (order && family) {
        const families = familiesByOrder.get(order) ?? [];
        if (!families.includes(family)) {
          families.push(family);
          familiesByOrder.set(order, families);
        }
      }
    }
  }

  return { familiesWithIcons, familiesByOrder };
}

/**
 * Load complete image registry.
 * Caches result for subsequent calls.
 */
export async function loadImageRegistry(): Promise<ImageRegistry> {
  if (registryCache) {
    return registryCache;
  }

  const imagesBySpecies = await loadImageMetadata();
  const { familiesWithIcons, familiesByOrder } =
    await loadFamilyIcons(imagesBySpecies);

  // Count total images
  let imageCount = 0;
  for (const images of imagesBySpecies.values()) {
    imageCount += images.length;
  }

  registryCache = {
    imagesBySpecies,
    familiesWithIcons,
    familiesByOrder,
    imageCount,
    loadedAt: new Date(),
  };

  console.log(
    `[image-registry] Registry complete: ${imageCount} images, ${familiesWithIcons.size} family icons`
  );
  return registryCache;
}

/**
 * Get images for a species, sorted by author priority.
 * Returns empty array if species has no images.
 */
export async function getImagesForSpecies(
  speciesName: string
): Promise<SpeciesImage[]> {
  const registry = await loadImageRegistry();
  return registry.imagesBySpecies.get(speciesName) ?? [];
}

/**
 * Check if a family has an SVG icon.
 */
export async function hasFamilyIcon(family: string): Promise<boolean> {
  const registry = await loadImageRegistry();
  return registry.familiesWithIcons.has(family);
}

/**
 * Get a deterministic family for an order (first alphabetically with icon).
 * Used for order icon selection (ICON-03).
 */
export async function getFamilyForOrder(order: string): Promise<string | null> {
  const registry = await loadImageRegistry();
  const families = registry.familiesByOrder.get(order) ?? [];

  // Filter to families that have icons, sort alphabetically for determinism
  const withIcons = families
    .filter((f) => registry.familiesWithIcons.has(f))
    .sort();

  return withIcons[0] ?? null;
}

/**
 * Clear registry cache (for testing or manual refresh).
 */
export function clearImageRegistryCache(): void {
  registryCache = null;
}

/**
 * Get the set of species names that have at least one image.
 * Returns the raw species names (not slugified IDs).
 */
export async function getSpeciesWithImages(): Promise<Set<string>> {
  const registry = await loadImageRegistry();
  return new Set(registry.imagesBySpecies.keys());
}
