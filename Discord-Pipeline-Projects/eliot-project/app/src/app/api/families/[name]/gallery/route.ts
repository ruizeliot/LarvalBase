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
  /** Section type for styling: family, genus, or species */
  sectionType?: 'family' | 'genus' | 'species';
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
        const imgPath = (row.PATH || '').replace(/^"|"$/g, '').replace(/^images\//, '');
        const fileName = (row.FILE_NAME || '').replace(/^"|"$/g, '');
        const author = (row.AUTHOR || '').replace(/^"|"$/g, '');
        const genus = row.GENUS ? row.GENUS.replace(/^"|"$/g, '') : null;
        const species = row.VALID_NAME ? row.VALID_NAME.replace(/^"|"$/g, '') : null;

        if (!imgPath || !fileName) return;

        images.push({
          imageUrl: `/api/images/${encodeURIComponent(imgPath)}/${encodeURIComponent(fileName)}`,
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
 * Returns gallery images organized in order:
 * 1. Family-level IDs (fam_ids_pics_metadata.txt)
 * 2. Genus-level IDs (gen_ids_pics_metadata.txt)
 * 3. Species grouped by genus sections, then species subsections, sorted by author
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

    const sections: GallerySection[] = [];

    // 1. Family-level IDs first
    if (familyImages.length > 0) {
      familyImages.sort((a, b) => a.author.localeCompare(b.author));
      sections.push({
        genus: `${family} — Family-level identifications`,
        images: familyImages,
        sectionType: 'family',
      });
    }

    // 2. Genus-level IDs grouped by genus
    const genusByName = new Map<string, GalleryImage[]>();
    for (const img of genusImages) {
      const genusName = img.genus || 'Unknown';
      const list = genusByName.get(genusName) ?? [];
      list.push(img);
      genusByName.set(genusName, list);
    }
    for (const [genusName, images] of [...genusByName.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      images.sort((a, b) => a.author.localeCompare(b.author));
      sections.push({
        genus: `${genusName} sp. — Genus-level identifications`,
        images,
        sectionType: 'genus',
      });
    }

    // 3. Species-level IDs: filter certain/uncertain, group by genus then species
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

    // Merge: certain first, uncertain only if no certain for that species
    const filteredBySpecies = new Map<string, GalleryImage[]>();
    const allSpeciesKeys = new Set([...speciesCertainMap.keys(), ...speciesUncertainMap.keys()]);
    for (const key of allSpeciesKeys) {
      const certain = speciesCertainMap.get(key);
      if (certain && certain.length > 0) {
        filteredBySpecies.set(key, certain);
      } else {
        const uncertain = speciesUncertainMap.get(key);
        if (uncertain) filteredBySpecies.set(key, uncertain);
      }
    }

    // Group species by genus for sections
    const speciesByGenus = new Map<string, Map<string, GalleryImage[]>>();
    for (const [speciesName, images] of filteredBySpecies) {
      const genusName = images[0]?.genus || 'Unknown';
      if (!speciesByGenus.has(genusName)) speciesByGenus.set(genusName, new Map());
      speciesByGenus.get(genusName)!.set(speciesName, images);
    }

    // Add species sections sorted by genus, then species, sorted by author
    for (const [genusName, speciesMap] of [...speciesByGenus.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const allGenusSpeciesImages: GalleryImage[] = [];
      for (const [, images] of [...speciesMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        images.sort((a, b) => a.author.localeCompare(b.author));
        allGenusSpeciesImages.push(...images);
      }
      sections.push({
        genus: genusName,
        images: allGenusSpeciesImages,
        sectionType: 'species',
      });
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
