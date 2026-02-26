import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface GalleryImage {
  imageUrl: string;
  species: string | null;
  genus: string | null;
  author: string;
  uncertain: boolean;
  level: 'species' | 'genus' | 'family';
}

interface GallerySection {
  genus: string;
  images: GalleryImage[];
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
    const content = await fs.readFile(filePath, 'utf-8');
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
        const filePath = (row.PATH || '').replace(/^"|"$/g, '').replace(/^images\//, '');
        const fileName = (row.FILE_NAME || '').replace(/^"|"$/g, '');
        const author = (row.AUTHOR || '').replace(/^"|"$/g, '');
        const genus = row.GENUS ? row.GENUS.replace(/^"|"$/g, '') : null;
        const species = row.VALID_NAME ? row.VALID_NAME.replace(/^"|"$/g, '') : null;

        if (!filePath || !fileName) return;

        images.push({
          imageUrl: `/api/images/${encodeURIComponent(filePath)}/${encodeURIComponent(fileName)}`,
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
 * Returns gallery images for a family, organized by genus sections.
 * Includes species-level, genus-level, and family-level images.
 * Prioritizes blackwater images, excludes uncertain unless only option.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: familyName } = await params;
    const family = decodeURIComponent(familyName);
    const imagesDir = path.join(process.cwd(), 'images');

    // Load from all three metadata files in parallel
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

    // Filter species images: prefer certain, use uncertain only if no certain exists per species
    const speciesCertainMap = new Map<string, GalleryImage[]>();
    const speciesUncertainMap = new Map<string, GalleryImage[]>();
    for (const img of speciesImages) {
      const key = img.species || 'unknown';
      if (img.uncertain) {
        const list = speciesUncertainMap.get(key) ?? [];
        list.push(img);
        speciesUncertainMap.set(key, list);
      } else {
        const list = speciesCertainMap.get(key) ?? [];
        list.push(img);
        speciesCertainMap.set(key, list);
      }
    }

    // Merge: certain first, uncertain only if no certain
    const filteredSpeciesImages: GalleryImage[] = [];
    const allSpeciesKeys = new Set([...speciesCertainMap.keys(), ...speciesUncertainMap.keys()]);
    for (const key of allSpeciesKeys) {
      const certain = speciesCertainMap.get(key);
      if (certain && certain.length > 0) {
        filteredSpeciesImages.push(...certain);
      } else {
        const uncertain = speciesUncertainMap.get(key);
        if (uncertain) filteredSpeciesImages.push(...uncertain);
      }
    }

    // Group all images by genus
    const genusSections = new Map<string, GalleryImage[]>();

    for (const img of [...filteredSpeciesImages, ...genusImages]) {
      const genusName = img.genus || 'Unidentified';
      const list = genusSections.get(genusName) ?? [];
      list.push(img);
      genusSections.set(genusName, list);
    }

    // Sort sections by genus name
    const sections: GallerySection[] = Array.from(genusSections.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([genus, images]) => ({ genus, images }));

    // Family-level images go in a separate "Unidentified" section
    const familySection: GallerySection | null =
      familyImages.length > 0
        ? { genus: `${family} (family-level)`, images: familyImages }
        : null;

    if (familySection) {
      sections.push(familySection);
    }

    return NextResponse.json(
      { family, sections },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error('Error loading family gallery:', error);
    return NextResponse.json(
      { error: 'Failed to load gallery' },
      { status: 500 }
    );
  }
}
