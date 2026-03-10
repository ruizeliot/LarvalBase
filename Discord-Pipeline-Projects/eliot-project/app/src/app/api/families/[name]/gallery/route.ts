import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { buildImageUrl, extractCopyright } from '@/lib/utils/encode-image-path';
import { getAuthorTier } from '@/lib/types/image.types';

interface GalleryImage {
  imageUrl: string;
  species: string | null;
  genus: string | null;
  author: string;
  uncertain: boolean;
  level: 'species' | 'genus' | 'family';
  link?: string;
  brightness: number;
}

/** Cached brightness data */
let galleryBrightnessCache: Map<string, number> | null = null;

async function loadBrightnessMap(): Promise<Map<string, number>> {
  if (galleryBrightnessCache) return galleryBrightnessCache;
  galleryBrightnessCache = new Map();
  try {
    const darknessPath = path.join(process.cwd(), 'images', 'image_darkness.txt');
    const content = await fs.readFile(darknessPath, 'utf-8');
    for (const line of content.split('\n').slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const tabIdx = trimmed.lastIndexOf('\t');
      if (tabIdx === -1) continue;
      const imgPath = trimmed.slice(0, tabIdx);
      const brightness = parseFloat(trimmed.slice(tabIdx + 1));
      if (!isNaN(brightness)) galleryBrightnessCache.set(imgPath, brightness);
    }
  } catch { /* brightness file not available */ }
  return galleryBrightnessCache;
}

/** Multi-criteria sort: tier → certainty → brightness → author */
function sortGalleryImages(images: GalleryImage[]): void {
  images.sort((a, b) => {
    const aTier = getAuthorTier(a.author);
    const bTier = getAuthorTier(b.author);
    if (aTier !== bTier) return aTier - bTier;
    const certA = a.uncertain ? 1 : 0;
    const certB = b.uncertain ? 1 : 0;
    if (certA !== certB) return certA - certB;
    if (a.brightness !== b.brightness) return a.brightness - b.brightness;
    return a.author.localeCompare(b.author);
  });
}

interface SpeciesSubsection {
  speciesName: string;
  images: GalleryImage[];
}

interface GenusSection {
  genusName: string;
  genusImages: GalleryImage[];       // genus-level IDs
  speciesSubsections: SpeciesSubsection[];  // species-level IDs grouped by species
}

interface GalleryResponse {
  family: string;
  genusSections: GenusSection[];
  familyImages: GalleryImage[];      // family-level IDs at bottom
}

/**
 * Parse a metadata file and return images matching the given family.
 */
async function parseMetadataForFamily(
  filePath: string,
  family: string,
  level: 'species' | 'genus' | 'family',
  brightnessMap: Map<string, number>
): Promise<GalleryImage[]> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');

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

    const images: GalleryImage[] = [];

    Papa.parse(content, {
      delimiter: '@',
      header: true,
      skipEmptyLines: true,
      step: (result) => {
        const row = result.data as Record<string, string>;
        const rowFamily = (row.FAMILY || '').replace(/^"|"$/g, '');
        if (rowFamily !== family) return;

        const uncertain = (row.UNCERTAIN || '').replace(/^"|"$/g, '') === 'TRUE';
        const imgPath = (row.PATH || '').replace(/^"|"$/g, '').replace(/^images\//, '').replace(/^Final image database\//, '');
        const fileName = (row.FILE_NAME || '').replace(/^"|"$/g, '');
        const author = (row.AUTHOR || '').replace(/^"|"$/g, '');
        const genus = row.GENUS ? row.GENUS.replace(/^"|"$/g, '') : null;
        const species = row.VALID_NAME ? row.VALID_NAME.replace(/^"|"$/g, '') : null;
        const rawLink = (row.LINK || '').replace(/^"|"$/g, '');
        const link = rawLink && rawLink !== 'NA' ? rawLink : undefined;

        if (!imgPath || !fileName) return;

        const brightnessKey = `${imgPath}/${fileName}`;
        const brightness = brightnessMap.get(brightnessKey) ?? 999;

        const copyright = extractCopyright(author);
        images.push({
          imageUrl: buildImageUrl(imgPath, fileName, copyright || undefined),
          species,
          genus,
          author,
          uncertain,
          level,
          link,
          brightness,
        });
      },
    });

    return images;
  } catch {
    return [];
  }
}

/**
 * GET /api/families/[name]/gallery
 *
 * Returns gallery images organized as:
 * - genusSections[]: per genus, with genus-level images on top + species subsections below
 * - familyImages[]: family-level IDs at the bottom
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: familyName } = await params;
    const family = decodeURIComponent(familyName);
    const imagesDir = path.join(process.cwd(), 'images');
    const brightnessMap = await loadBrightnessMap();

    const [speciesImages, genusImages, familyImages] = await Promise.all([
      parseMetadataForFamily(
        path.join(imagesDir, 'sp_ids_pics_metadata_03_2026.txt'),
        family,
        'species',
        brightnessMap
      ),
      parseMetadataForFamily(
        path.join(imagesDir, 'gen_ids_pics_metadata_03_2026.txt'),
        family,
        'genus',
        brightnessMap
      ),
      parseMetadataForFamily(
        path.join(imagesDir, 'fam_ids_pics_metadata_03_2026.txt'),
        family,
        'family',
        brightnessMap
      ),
    ]);

    // Group genus-level images by genus name
    const genusImagesByGenus = new Map<string, GalleryImage[]>();
    for (const img of genusImages) {
      const g = img.genus || 'Unknown';
      const list = genusImagesByGenus.get(g) ?? [];
      list.push(img);
      genusImagesByGenus.set(g, list);
    }

    // Group species-level images by genus → species (ALL images, certain + uncertain)
    const speciesByGenus = new Map<string, Map<string, GalleryImage[]>>();

    for (const img of speciesImages) {
      const key = img.species || 'unknown';
      const genusName = img.genus || 'Unknown';
      if (!speciesByGenus.has(genusName)) speciesByGenus.set(genusName, new Map());
      const speciesMap = speciesByGenus.get(genusName)!;
      const list = speciesMap.get(key) ?? [];
      list.push(img);
      speciesMap.set(key, list);
    }

    // Collect all genus names (from both genus-level and species-level)
    const allGenera = new Set([...genusImagesByGenus.keys(), ...speciesByGenus.keys()]);

    // Build genus sections
    const genusSections: GenusSection[] = [];
    for (const genusName of [...allGenera].sort()) {
      const genusImgs = genusImagesByGenus.get(genusName) ?? [];
      sortGalleryImages(genusImgs);

      const speciesMap = speciesByGenus.get(genusName) ?? new Map();
      const speciesSubsections: SpeciesSubsection[] = [];
      for (const [speciesName, images] of [...speciesMap.entries()].sort((a: [string, GalleryImage[]], b: [string, GalleryImage[]]) => a[0].localeCompare(b[0]))) {
        sortGalleryImages(images);
        speciesSubsections.push({ speciesName, images });
      }

      genusSections.push({
        genusName,
        genusImages: genusImgs,
        speciesSubsections,
      });
    }

    // Family images at bottom
    sortGalleryImages(familyImages);

    const response: GalleryResponse = {
      family,
      genusSections,
      familyImages,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Error loading family gallery:', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}
