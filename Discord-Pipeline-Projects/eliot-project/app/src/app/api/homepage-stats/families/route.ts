import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOrLoadData } from '@/lib/data/data-repository';
import { loadImageRegistry } from '@/lib/data/image-registry';
import { buildImageUrl } from '@/lib/utils/encode-image-path';
import { BLACKWATER_AUTHORS, SECONDARY_AUTHORS, TERTIARY_AUTHORS } from '@/lib/types/image.types';

/**
 * Count images per family from a metadata file.
 *
 * Handles the row-number column offset: fam_ids and gen_ids metadata files
 * have a leading row-number column in data rows but NO header for it.
 * Without detection, Papa Parse misaligns all columns (FAMILY gets ORDER).
 */
async function countImagesFromMetadata(
  filePath: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    let content = await fs.readFile(filePath, 'utf-8');

    // Detect row-number column offset: if first data row has more fields
    // than the header, prepend an empty header for the row-number column.
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

    // Load image darkness values (mean brightness, lower = darker = blackwater)
    const darknessByPath = new Map<string, number>();
    try {
      const darknessContent = await fs.readFile(
        path.join(imagesDir, 'image_darkness.txt'),
        'utf-8'
      );
      for (const line of darknessContent.split('\n').slice(1)) { // skip header
        const trimmed = line.trim();
        if (!trimmed) continue;
        const tabIdx = trimmed.lastIndexOf('\t');
        if (tabIdx === -1) continue;
        const imgPath = trimmed.slice(0, tabIdx);
        const brightness = parseFloat(trimmed.slice(tabIdx + 1));
        if (!isNaN(brightness)) darknessByPath.set(imgPath, brightness);
      }
    } catch {
      // darkness file not available — fall back to path-based detection
    }

    // Collect thumbnail candidates per family from ALL metadata sources
    // (species-level, genus-level, AND family-level images)
    type Candidate = { imageUrl: string; brightness: number; uncertain: boolean; imgPath: string; filename: string; author: string; level: 'species' | 'genus' | 'family' };
    const familyCandidates = new Map<string, Candidate[]>();

    const addCandidate = (family: string, imgPath: string, filename: string, uncertain: boolean, author: string, level: 'species' | 'genus' | 'family' = 'species') => {
      const relPath = `${imgPath}/${filename}`;
      const brightness = darknessByPath.get(relPath) ?? 999;
      const candidates = familyCandidates.get(family) ?? [];
      candidates.push({
        imageUrl: buildImageUrl(imgPath, filename),
        brightness,
        uncertain,
        imgPath,
        filename,
        author,
        level,
      });
      familyCandidates.set(family, candidates);
    };

    // 1. Species-level images (from image registry)
    for (const images of imageRegistry.imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family) continue;
        addCandidate(img.family, img.path, img.filename, img.uncertain, img.author);
      }
    }

    // 2. Also parse fam_ids and gen_ids metadata for additional blackwater candidates
    // (some families only have BW images at genus/family level, not species level)
    for (const metaFile of ['fam_ids_pics_metadata.txt', 'gen_ids_pics_metadata.txt'] as const) {
      const metaLevel: 'species' | 'genus' | 'family' = metaFile.startsWith('fam_') ? 'family' : 'genus';
      try {
        let content = await fs.readFile(path.join(imagesDir, metaFile), 'utf-8');
        const lines = content.split('\n');
        if (lines.length < 2) continue;

        // Detect row-number offset
        const headerFields = lines[0].split('@').length;
        let offset = 0;
        for (let i = 1; i < Math.min(lines.length, 5); i++) {
          const line = lines[i].trim();
          if (!line) continue;
          if (line.split('@').length > headerFields) offset = 1;
          break;
        }
        if (offset === 1) {
          lines[0] = '""@' + lines[0];
          content = lines.join('\n');
        }

        Papa.parse(content, {
          delimiter: '@',
          header: true,
          skipEmptyLines: true,
          step: (result: { data: Record<string, string> }) => {
            const row = result.data;
            const family = (row.FAMILY || '').replace(/^"|"$/g, '');
            const imgPath = (row.PATH || '').replace(/^"|"$/g, '').replace(/^images\//, '');
            const fileName = (row.FILE_NAME || '').replace(/^"|"$/g, '');
            const uncertain = (row.UNCERTAIN || '').replace(/^"|"$/g, '') === 'TRUE';
            const rowAuthor = (row.AUTHOR || '').replace(/^"|"$/g, '');
            if (family && imgPath && fileName) {
              addCandidate(family, imgPath, fileName, uncertain, rowAuthor, metaLevel);
            }
          },
        });
      } catch {
        // skip if file not found
      }
    }

    // Select best valid thumbnail per family:
    // Priority: 1. Blackwater + species-level + sure ID (darkest first)
    //           2. Secondary authors + sure ID (darkest first)
    //           3. Tertiary authors + sure ID (darkest first)
    //           4. Other authors + sure ID (darkest first)
    //           5. Uncertain images (same tier ordering)
    const familyImageMap = new Map<string, string>();

    function getAuthorTierForSort(author: string): number {
      if (BLACKWATER_AUTHORS.has(author)) return 1;
      if (SECONDARY_AUTHORS.has(author)) return 2;
      if (TERTIARY_AUTHORS.has(author)) return 3;
      return 4;
    }

    for (const [family, candidates] of familyCandidates) {
      candidates.sort((a, b) => {
        // Species-level preferred over genus/family level
        const levelOrder = { species: 0, genus: 1, family: 2 };
        const aLevel = levelOrder[a.level] ?? 2;
        const bLevel = levelOrder[b.level] ?? 2;
        if (aLevel !== bLevel) return aLevel - bLevel;
        // Certain before uncertain
        if (a.uncertain !== b.uncertain) return a.uncertain ? 1 : -1;
        // Author tier (blackwater > secondary > tertiary > other)
        const aTier = getAuthorTierForSort(a.author);
        const bTier = getAuthorTierForSort(b.author);
        if (aTier !== bTier) return aTier - bTier;
        // Within same tier+certainty, darkest first
        return a.brightness - b.brightness;
      });
      for (const candidate of candidates) {
        // Verify file exists and is non-empty
        try {
          const filePath = path.join(imagesDir, candidate.imgPath, candidate.filename);
          const stat = await fs.stat(filePath);
          if (stat.size === 0) continue;
        } catch {
          continue;
        }
        familyImageMap.set(family, candidate.imageUrl);
        break;
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
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error loading family data:', error);
    return NextResponse.json(
      { error: 'Failed to load family data' },
      { status: 500 }
    );
  }
}
