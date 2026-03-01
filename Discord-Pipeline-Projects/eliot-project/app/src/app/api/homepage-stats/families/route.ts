import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOrLoadData } from '@/lib/data/data-repository';
import { loadImageRegistry } from '@/lib/data/image-registry';

/**
 * Count images per family from a metadata file.
 */
async function countImagesFromMetadata(
  filePath: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    Papa.parse(content, {
      delimiter: '@',
      header: true,
      skipEmptyLines: true,
      step: (result) => {
        const row = result.data as Record<string, string>;
        const family = (row.FAMILY || '').replace(/^"|"$/g, '');
        if (family) {
          counts.set(family, (counts.get(family) ?? 0) + 1);
        }
      },
    });
  } catch {
    // File not found — skip
  }
  return counts;
}

/**
 * GET /api/homepage-stats/families
 *
 * Returns family photo grid data: one entry per family, sorted by order.
 * Each entry includes the family name, order, species list with record counts,
 * and a representative image URL (preferring certain blackwater images).
 */
export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), 'images');
    const [data, imageRegistry, genCounts, famCounts] = await Promise.all([
      getOrLoadData(),
      loadImageRegistry(),
      countImagesFromMetadata(path.join(imagesDir, 'gen_ids_pics_metadata.txt')),
      countImagesFromMetadata(path.join(imagesDir, 'fam_ids_pics_metadata.txt')),
    ]);

    // Count ALL species-level images per family (no early break)
    const familyImageCount = new Map<string, number>();
    for (const images of imageRegistry.imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family) continue;
        familyImageCount.set(img.family, (familyImageCount.get(img.family) ?? 0) + 1);
      }
    }

    // Add genus-level and family-level image counts
    for (const [family, count] of genCounts) {
      familyImageCount.set(family, (familyImageCount.get(family) ?? 0) + count);
    }
    for (const [family, count] of famCounts) {
      familyImageCount.set(family, (familyImageCount.get(family) ?? 0) + count);
    }

    // Select best thumbnail per family: certain blackwater > certain any > first available
    // Images are already sorted by priority+certainty in the registry
    const familyImageMap = new Map<string, string>();
    const familyBestScore = new Map<string, number>(); // lower = better
    for (const images of imageRegistry.imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family) continue;
        const imageUrl = `/api/images/${encodeURIComponent(img.path)}/${encodeURIComponent(img.filename)}`;
        // Score: 0 = certain blackwater (best), 1 = certain other, 2 = uncertain
        const score = (!img.uncertain && img.author === 'Blackwater') ? 0
          : !img.uncertain ? 1
          : 2;
        const currentBest = familyBestScore.get(img.family) ?? 999;
        if (score < currentBest) {
          familyImageMap.set(img.family, imageUrl);
          familyBestScore.set(img.family, score);
        }
      }
    }

    // Group species by family
    const familyMap = new Map<string, {
      family: string;
      order: string;
      species: { validName: string; genus: string; records: number }[];
    }>();

    for (const sp of data.species.values()) {
      if (!familyMap.has(sp.family)) {
        familyMap.set(sp.family, {
          family: sp.family,
          order: sp.order,
          species: [],
        });
      }
      const fam = familyMap.get(sp.family)!;
      // Count records (traits) for this species
      const traits = data.traitsBySpecies.get(sp.id) || [];
      fam.species.push({
        validName: sp.validName,
        genus: sp.genus,
        records: traits.length,
      });
    }

    // Sort families by most images first (left→right, top→bottom)
    const familiesWithImages = Array.from(familyMap.values())
      .filter((f) => familyImageMap.has(f.family));

    const families = familiesWithImages
      .sort((a, b) => {
        const aCount = familyImageCount.get(a.family) ?? 0;
        const bCount = familyImageCount.get(b.family) ?? 0;
        // Most images first, then alphabetical family name
        return (bCount - aCount) || a.family.localeCompare(b.family);
      })
      .map((f) => ({
        ...f,
        imageUrl: familyImageMap.get(f.family)!,
        imageCount: familyImageCount.get(f.family) ?? 0,
        hasFamilyIcon: imageRegistry.familiesWithIcons.has(f.family),
      }));

    return NextResponse.json(
      { families },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error('Error loading family data:', error);
    return NextResponse.json(
      { error: 'Failed to load family data' },
      { status: 500 }
    );
  }
}
