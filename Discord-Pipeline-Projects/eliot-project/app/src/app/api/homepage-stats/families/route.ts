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

    // Manual thumbnail overrides: dark BG, subject fills frame
    const THUMBNAIL_OVERRIDES: Record<string, { path: string; filename: string }> = {
      'Gobiidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Gobiidae - gobiidae - Ryo Minemizu - 2020-08-23_07-47-16_1.jpg' },
      'Ophidiidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Ophidiidae - cusk eel. - Steven Kovacs - 2023-12-24_13-02-31_1.jpg' },
      'Holocentridae': { path: 'classified_bw_images_family', filename: 'Sure ID - Holocentridae - holocentridae - Yuichi Mazda - 2022-08-08_00-41-32_1.jpg' },
      'Epinephelidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Epinephelidae - grouper - Susan Mears - Blackwater-072116-9482-web_1.jpg' },
      'Scorpaenidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Hipposcorpaena filamentosa - hipposcorpaena filamentosa - Ryo Minemizu - 2020-10-08_12-00-34_1.jpg' },
      'Paralichthyidae': { path: 'Larvae literature images database - Renamed', filename: 'Citharichthys macrops - Sure ID - Species level - Vasquez-Yeomans et al. (2011) - MFLS3861+1287589682.jpg.jpg' },
      'Acanthuridae': { path: 'classified_bw_images_family', filename: 'Sure ID - Acanthuridae - surgeonfish - Suzan Meldonian - Surgeonfish-larva-9-1-18-8510lr_1.jpg' },
      'Synodontidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Synodontidae - lizardfish - Suzan Meldonian - Lizardfish-larva-7-9-16-706_1.jpg' },
      'Antennariidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Antennarius maculatus - antennarius maculatus - Ryo Minemizu - 2019-08-23_23-11-45_1.jpg' },
      'Peristediidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Peristediidae - #peristediidae - Chris Gug - 2025-06-10_13-09-46_1.jpg' },
      'Gibberichthyidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Gibberichthys latifrons - gibberichthys_latifrons - Ryo Minemizu - 2025-07-16_09-50-34_1.jpg' },
      'Brotulidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Brotula multibarbata - brotula multibarbata - Ryo Minemizu - 2019-03-21_01-03-48_1.jpg' },
      // Round 10 Fix 8: 14 family thumbnail upgrades
      'Xiphiidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Xiphias gladius - xiphias gladius - Steven Kovacs - 2017-07-07_17-22-17_1.jpg' },
      'Diodontidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Diodon holocanthus - diodon_holocanthus - Ryo Minemizu - 2022-04-25_12-00-11_1.jpg' },
      'Myctophidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Dasyscopelus asper - myctophum asperum - Ryo Minemizu - 2021-02-09_12-00-44_1.jpg' },
      'Chiasmodontidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Chiasmodon niger - black swallower - Ryo Minemizu - 2019-03-11_11-42-55_1.jpg' },
      'Carangidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Carangidae - carangidae - Linda Ianiello - Jack-Carangidae-Family-08282017_026_1.jpg' },
      'Pomacentridae': { path: 'classified_bw_images_species', filename: 'Sure ID - Dascyllus trimaculatus - dascyllus trimaculatus - Ryo Minemizu - 2019-07-27_16-44-49_1.jpg' },
      'Labridae': { path: 'classified_bw_images_species', filename: 'Sure ID - Doratonotus megalepis - doratonotus megalepis - Suzan Meldonian - Dwarf-wrasse-larva-5-12-17-5706_1.jpg' },
      'Apogonidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Apogonidae - apogonidae - Linda Ianiello - Cardinalfish-Larva-Apogonidae-Family-08172019_058_1.jpg' },
      'Blenniidae': { path: 'classified_bw_images_family', filename: 'Sure ID - Blenniidae - blenny - Steven Kovacs - 2021-06-30_17-58-32_1.jpg' },
      'Ostraciidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Lactoria cornuta - lactoria cornuta - Jeff Millisen - 2019-04-16_21-27-22_1.jpg' },
      'Gigantactinidae': { path: 'classified_bw_images_species', filename: 'Sure ID - Gigantactis vanhoeffeni - gigantactis vanhoeffeni - Facebook BW - post_10163446820113797_1.jpg' },
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
    const DARK_THRESHOLD = 80;

    function getAuthorTierForSort(author: string): number {
      if (BLACKWATER_AUTHORS.has(author)) return 1;
      if (SECONDARY_AUTHORS.has(author)) return 2;
      if (TERTIARY_AUTHORS.has(author)) return 3;
      return 4;
    }

    // "BW" authors tend to have truly black backgrounds (highest priority within blackwater)
    function isBWAuthor(author: string): boolean {
      return /\bBW\b/i.test(author);
    }

    function getPriorityGroup(c: Candidate): number {
      const isDark = c.brightness < DARK_THRESHOLD;
      const authorTier = getAuthorTierForSort(c.author);
      const isSpecies = c.level === 'species';

      if (isSpecies && isDark && authorTier === 1) return 1;
      if (isSpecies && isDark && authorTier <= 3) return 2;
      if (!isSpecies && isDark) return 3;
      if (isSpecies && authorTier === 1) return 4;
      if (isSpecies && authorTier <= 3) return 5;
      if (!isSpecies) return 6;
      return 7;
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
        // Certain before uncertain
        if (a.uncertain !== b.uncertain) return a.uncertain ? 1 : -1;
        // Priority group
        const aGroup = getPriorityGroup(a);
        const bGroup = getPriorityGroup(b);
        if (aGroup !== bGroup) return aGroup - bGroup;
        // Within same group, prefer BW authors
        const aBW = isBWAuthor(a.author);
        const bBW = isBWAuthor(b.author);
        if (aBW !== bBW) return aBW ? -1 : 1;
        // Within same group, darkest first (lowest brightness)
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
