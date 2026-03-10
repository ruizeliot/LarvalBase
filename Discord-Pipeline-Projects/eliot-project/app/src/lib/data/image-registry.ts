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

/** Cached brightness data: relative path -> mean brightness */
let brightnessCache: Map<string, number> | null = null;

/**
 * Load image brightness data from image_darkness.txt.
 * Format: TSV with header "PATH\tMEAN_BRIGHTNESS"
 * PATH is relative like "classified_bw_images_species/filename.jpg"
 */
async function loadBrightnessData(): Promise<Map<string, number>> {
  if (brightnessCache) return brightnessCache;

  brightnessCache = new Map();
  try {
    const darknessPath = path.join(getImagesDir(), 'image_darkness.txt');
    const content = await fs.readFile(darknessPath, 'utf-8');
    for (const line of content.split('\n').slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const tabIdx = trimmed.lastIndexOf('\t');
      if (tabIdx === -1) continue;
      const imgPath = trimmed.slice(0, tabIdx);
      const brightness = parseFloat(trimmed.slice(tabIdx + 1));
      if (!isNaN(brightness)) brightnessCache.set(imgPath, brightness);
    }
    console.log(`[image-registry] Loaded brightness for ${brightnessCache.size} images`);
  } catch {
    console.warn('[image-registry] image_darkness.txt not found — brightness tiebreaker disabled');
  }
  return brightnessCache;
}

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
  const metadataPath = path.join(getImagesDir(), 'sp_ids_pics_metadata_03_2026.txt');
  let content = await fs.readFile(metadataPath, 'utf-8');

  const imagesBySpecies = new Map<string, SpeciesImage[]>();
  const brightnessMap = await loadBrightnessData();

  // Detect row-number column offset
  const lines = content.split('\n');
  if (lines.length >= 2) {
    const headerFields = lines[0].split('@').length;
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const dataFields = line.split('@').length;
      if (dataFields === headerFields + 1) {
        lines[0] = '""@' + lines[0];
        content = lines.join('\n');
      }
      break;
    }
  }

  // Image to exclude per task requirement
  const EXCLUDED_FILENAME = 'Sure ID - Halieutichthys aculeatus - pancake batfish - Gabriel Jensen - 2025-07-04_03-51-42_1';

  Papa.parse(content, {
    delimiter: '@',
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      try {
        const parsed = ImageMetadataSchema.parse(result.data);

        // Filter out excluded image
        if (parsed.FILE_NAME.includes(EXCLUDED_FILENAME)) return;

        // Extract relative path from full path
        // Remove "images/" prefix if present, and "Final image database/" prefix
        // (metadata has "Final image database/..." but VPS stores directly under images/)
        const relativePath = parsed.PATH
          .replace(/^images\//, '')
          .replace(/^Final image database\//, '');

        // Get display author — use raw AUTHOR field directly
        const displayAuthor = parsed.AUTHOR;

        // Parse LINK — treat "NA" as undefined
        const link = parsed.LINK && parsed.LINK !== 'NA' ? parsed.LINK : undefined;

        // Look up brightness: key is "relativePath/filename"
        const brightnessKey = `${relativePath}/${parsed.FILE_NAME}`;
        const brightness = brightnessMap.get(brightnessKey) ?? 999;

        const image: SpeciesImage = {
          author: parsed.AUTHOR,
          displayAuthor,
          uncertain: parsed.UNCERTAIN,
          path: relativePath,
          filename: parsed.FILE_NAME,
          sourceDescription: '',
          priority: getAuthorPriority(parsed.AUTHOR),
          speciesName: parsed.VALID_NAME,
          family: parsed.FAMILY,
          order: parsed.ORDER,
          scale: parsed.SCALE,
          link,
          brightness,
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

  // Sort each species' images by multi-criteria priority:
  // 1. Primary: Author tier (1=Blackwater, 2=Secondary, 3=Tertiary, 4=Other)
  // 2. Secondary: Certainty — UNCERTAIN=FALSE (sure ID) before UNCERTAIN=TRUE
  // 3. Tertiary: Brightness — darkest first (lower value = blacker background)
  // 4. Quaternary: Filename for deterministic tiebreaker
  for (const [species, images] of imagesBySpecies) {
    images.sort((a, b) => {
      // 1. Author tier (lower = higher priority)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // 2. Certain before uncertain
      const certA = a.uncertain ? 1 : 0;
      const certB = b.uncertain ? 1 : 0;
      if (certA !== certB) return certA - certB;
      // 3. Darkest first (lowest brightness value)
      if (a.brightness !== b.brightness) return a.brightness - b.brightness;
      // 4. Stable tiebreaker: sort by filename for deterministic thumbnail selection
      return a.filename.localeCompare(b.filename);
    });
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
  brightnessCache = null;
}

/**
 * Get the set of species names that have at least one image.
 * Returns the raw species names (not slugified IDs).
 */
export async function getSpeciesWithImages(): Promise<Set<string>> {
  const registry = await loadImageRegistry();
  return new Set(registry.imagesBySpecies.keys());
}

/**
 * Get species names with at least one Sure ID image (uncertain=false).
 */
export async function getSpeciesWithSureImages(): Promise<Set<string>> {
  const registry = await loadImageRegistry();
  const result = new Set<string>();
  for (const [species, images] of registry.imagesBySpecies) {
    if (images.some((img) => !img.uncertain)) {
      result.add(species);
    }
  }
  return result;
}

/**
 * Get species names with at least one Unsure ID image (uncertain=true).
 */
export async function getSpeciesWithUnsureImages(): Promise<Set<string>> {
  const registry = await loadImageRegistry();
  const result = new Set<string>();
  for (const [species, images] of registry.imagesBySpecies) {
    if (images.some((img) => img.uncertain)) {
      result.add(species);
    }
  }
  return result;
}
