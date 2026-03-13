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
      countImagesFromMetadata(path.join(imagesDir, 'gen_ids_pics_metadata_03_2026.txt')),
      countImagesFromMetadata(path.join(imagesDir, 'fam_ids_pics_metadata_03_2026.txt')),
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
    for (const metaFile of ['fam_ids_pics_metadata_03_2026.txt', 'gen_ids_pics_metadata_03_2026.txt'] as const) {
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
            const imgPath = (row.PATH || '').replace(/^"|"$/g, '').replace(/^images\//, '').replace(/^Final image database[^/]*\//, '');
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

    // Manual thumbnail overrides: dark BG, subject fills frame
    // Uses original filenames (no watermark) matching GitHub images/ structure
    const THUMBNAIL_OVERRIDES: Record<string, { path: string; filename: string }> = {
      // --- Existing curated overrides ---
      // All filenames must include "Copyright " prefix to match actual files on VPS
      'Gobiidae': { path: 'classified_bw_images_family', filename: 'Copyright Minemizu (2026) - 8669.jpg' },
      'Ophidiidae': { path: 'classified_bw_images_species', filename: 'Copyright Kovacs (2026) - 6953.jpg' },
      'Holocentridae': { path: 'classified_bw_images_family', filename: 'Copyright Mazda (2026) - 8674.jpg' },
      'Scorpaenidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6909.jpg' },
      'Paralichthyidae': { path: 'classified_bw_images_species', filename: 'Copyright Jensen (2026) - 6625.jpg' },
      'Acanthuridae': { path: 'classified_bw_images_species', filename: 'Copyright Meldonian (2026) - 6323.jpg' },
      'Synodontidae': { path: 'classified_bw_images_species', filename: 'Copyright Meldonian (2026) - 7298.jpg' },
      'Antennariidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6364.jpg' },
      'Peristediidae': { path: 'classified_bw_images_family', filename: 'Copyright Gug (2026) - 8915.jpg' },
      'Gibberichthyidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6788.jpg' },
      'Brotulidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6482.jpg' },
      'Xiphiidae': { path: 'classified_bw_images_species', filename: 'Copyright Kovacs (2026) - 7364.jpg' },
      'Diodontidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6723.jpg' },
      'Chiasmodontidae': { path: 'classified_bw_images_family', filename: 'Copyright Zhang F. (2026) - 9069.jpg' },
      'Carangidae': { path: 'classified_bw_images_family', filename: 'Copyright Ianiello (2026) - 8603.jpg' },
      'Pomacentridae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6712.jpg' },
      'Labridae': { path: 'classified_bw_images_species', filename: 'Copyright Ianiello (2026) - 7310.jpg' },
      'Apogonidae': { path: 'classified_bw_images_family', filename: 'Copyright Ianiello (2026) - 8486.jpg' },
      'Blenniidae': { path: 'classified_bw_images_species', filename: 'Copyright Baensch (2026) - 6769.jpg' },
      'Ostraciidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6948.jpg' },
      'Gigantactinidae': { path: 'classified_bw_images_species', filename: 'Copyright BW FB group (2026) - 6059.jpg' },
      // --- Round 31+47: Eliot-requested overrides ---
      'Sparidae': { path: 'Guadeloupe', filename: 'Copyright Ruiz et al. (2026) - 4188.JPG' },
      'Epinephelidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 7345.jpg' },
      'Gerreidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Grande et al. (2019) - 16.png' },
      'Anguillidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Tsukamoto et al. (2009) - 203.png' },
      'Sciaenidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Vasquez-Yeomans et al. (2011) - 2164.jpg' },
      'Fistulariidae': { path: 'classified_bw_images_genus', filename: 'Copyright Baensch (2026) - 8356.jpg' },
      'Myctophidae': { path: 'classified_bw_images_family', filename: 'Copyright BW FB group (2026) - 8758.jpg' },
      'Kyphosidae': { path: 'classified_bw_images_family', filename: 'Copyright Baensch (2026) - 8644.jpg' },
      'Cottidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Sakuma et al. (2013) - 8075.png' },
      'Pempheridae': { path: 'Maldives', filename: 'Copyright Ruiz et al. (2026) - 5286.jpg' },
      'Pseudochromidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Chen et al. (2023) - 2379.png' },
      'Nettastomatidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Miller (2023) - 7494.png' },
      'Chlopsidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Moore et al. (2020) - 643.png' },
      'Engraulidae': { path: 'other_genus_pictures', filename: 'Copyright Ruiz et al. (2026) - 7727.JPG' },
      'Hapalogenyidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright the99spiker (2024) - 1387.png' },
      'Leiognathidae': { path: 'Vietnam', filename: 'Copyright Pham & Durand (2017) - 5340.jpg' },
      'Liparidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Sakuma et al. (2013) - 8123.png' },
      'Spratelloididae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Sakuma et al. (2013) - 8123.png' },
      'Elopidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Moore et al. (2020) - 13.png' },
      'Lophotidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 6990.jpg' },
      'Synagropidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright the99spiker (2019) - 2159.png' },
      'Caristiidae': { path: 'classified_bw_images_family', filename: 'Copyright Zhang J. (2026) - 9060.jpg' },
      'Eurypharyngidae': { path: '.', filename: 'Copyright Poulsen et al. (2018) - 7474.png' },
      // --- Round 32: More thumbnail overrides ---
      'Chaenopsidae': { path: 'Larvae literature images database - Renamed', filename: 'Copyright Vasquez-Yeomans et al. (2011) - 75.png' },
      'Labrisomidae': { path: 'Guadeloupe', filename: 'Copyright Ruiz et al. (2026) - 5010.JPG' },
      'Serranidae': { path: 'classified_bw_images_species', filename: 'Copyright Ianiello (2026) - 7231.jpg' },
      'Nemipteridae': { path: 'Fisher - Cropped', filename: 'Copyright Fisher et al. (2022) - 5685.JPG' },
      'Anthiadidae': { path: 'classified_bw_images_species', filename: 'Copyright Minemizu (2026) - 7097.jpg' },
    };

    // Select best valid thumbnail per family:
    // Priority groups (dark = brightness < 80):
    //   1. Species-level + dark + blackwater author
    //   2. Species-level + dark + priority author
    //   3. Genus/family-level + dark (any author) — better than light species
    //   4. Species-level + blackwater + any brightness
    //   5. Species-level + priority + any brightness
    //   6. Genus/family-level + any brightness
    //   7. Everything else
    // Within each group: certain > uncertain, BW authors first, then darkest
    const familyImageMap = new Map<string, string>();

    function getAuthorTierForSort(author: string): number {
      if (BLACKWATER_AUTHORS.has(author)) return 1;
      if (SECONDARY_AUTHORS.has(author)) return 2;
      if (TERTIARY_AUTHORS.has(author)) return 3;
      return 4;
    }

    // Apply manual overrides first
    for (const [family, override] of Object.entries(THUMBNAIL_OVERRIDES)) {
      try {
        const filePath = path.join(imagesDir, override.path, override.filename);
        const stat = await fs.stat(filePath);
        if (stat.size > 0) {
          familyImageMap.set(family, buildImageUrl(override.path, override.filename));
        }
      } catch {
        // Override image not found — fall through to automatic selection
      }
    }

    for (const [family, candidates] of familyCandidates) {
      if (familyImageMap.has(family)) continue; // skip if override already set
      candidates.sort((a, b) => {
        // 1. Author tier (blackwater first)
        const aTier = getAuthorTierForSort(a.author);
        const bTier = getAuthorTierForSort(b.author);
        if (aTier !== bTier) return aTier - bTier;
        // 2. Certain before uncertain
        if (a.uncertain !== b.uncertain) return a.uncertain ? 1 : -1;
        // 3. Species-level before genus/family-level
        const aSpecies = a.level === 'species' ? 0 : 1;
        const bSpecies = b.level === 'species' ? 0 : 1;
        if (aSpecies !== bSpecies) return aSpecies - bSpecies;
        // 4. Darkest first (lowest brightness)
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
