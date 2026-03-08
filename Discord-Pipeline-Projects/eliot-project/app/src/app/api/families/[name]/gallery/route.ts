import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { buildImageUrl, extractCopyright } from '@/lib/utils/encode-image-path';

interface GalleryImage {
  imageUrl: string;
  species: string | null;
  genus: string | null;
  author: string;
  uncertain: boolean;
  level: 'species' | 'genus' | 'family';
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
  level: 'species' | 'genus' | 'family'
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

        if (!imgPath || !fileName) return;

        const copyright = extractCopyright(author);
        images.push({
          imageUrl: buildImageUrl(imgPath, fileName, copyright || undefined),
          species,
          genus,
          author,
          uncertain,
          level,
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

    const [speciesImages, genusImages, familyImages] = await Promise.all([
      parseMetadataForFamily(
        path.join(imagesDir, 'sp_ids_pics_metadata.txt'),
        family,
        'species'
      ),
      parseMetadataForFamily(
        path.join(imagesDir, 'gen_ids_pics_metadata.txt'),
        family,
        'genus'
      ),
      parseMetadataForFamily(
        path.join(imagesDir, 'fam_ids_pics_metadata.txt'),
        family,
        'family'
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

    // Group species-level images by genus → species
    // Prefer certain over uncertain per species
    const speciesByGenus = new Map<string, Map<string, GalleryImage[]>>();
    const certainBySpecies = new Map<string, GalleryImage[]>();
    const uncertainBySpecies = new Map<string, GalleryImage[]>();

    for (const img of speciesImages) {
      const key = img.species || 'unknown';
      if (img.uncertain) {
        const list = uncertainBySpecies.get(key) ?? [];
        list.push(img);
        uncertainBySpecies.set(key, list);
      } else {
        const list = certainBySpecies.get(key) ?? [];
        list.push(img);
        certainBySpecies.set(key, list);
      }
    }

    const allSpeciesKeys = new Set([...certainBySpecies.keys(), ...uncertainBySpecies.keys()]);
    for (const key of allSpeciesKeys) {
      const certain = certainBySpecies.get(key);
      const images = (certain && certain.length > 0) ? certain : (uncertainBySpecies.get(key) ?? []);
      const genusName = images[0]?.genus || 'Unknown';
      if (!speciesByGenus.has(genusName)) speciesByGenus.set(genusName, new Map());
      speciesByGenus.get(genusName)!.set(key, images);
    }

    // Collect all genus names (from both genus-level and species-level)
    const allGenera = new Set([...genusImagesByGenus.keys(), ...speciesByGenus.keys()]);

    // Build genus sections
    const genusSections: GenusSection[] = [];
    for (const genusName of [...allGenera].sort()) {
      const genusImgs = genusImagesByGenus.get(genusName) ?? [];
      genusImgs.sort((a, b) => a.author.localeCompare(b.author));

      const speciesMap = speciesByGenus.get(genusName) ?? new Map();
      const speciesSubsections: SpeciesSubsection[] = [];
      for (const [speciesName, images] of [...speciesMap.entries()].sort((a: [string, GalleryImage[]], b: [string, GalleryImage[]]) => a[0].localeCompare(b[0]))) {
        images.sort((a: GalleryImage, b: GalleryImage) => a.author.localeCompare(b.author));
        speciesSubsections.push({ speciesName, images });
      }

      genusSections.push({
        genusName,
        genusImages: genusImgs,
        speciesSubsections,
      });
    }

    // Family images at bottom
    familyImages.sort((a, b) => a.author.localeCompare(b.author));

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
