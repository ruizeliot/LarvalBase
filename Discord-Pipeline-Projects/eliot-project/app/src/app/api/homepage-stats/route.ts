import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOrLoadData } from '@/lib/data/data-repository';
import { loadImageRegistry } from '@/lib/data/image-registry';

/**
 * Trait display names for the barplots.
 * Maps database filename patterns to human-readable trait names.
 */
const TRAIT_DISPLAY_NAMES: Record<string, string> = {
  egg_database: 'Egg traits',
  hatching_size: 'Hatching/parturition size',
  incubation: 'Incubation/gestation',
  first_feeding_age: 'First feeding age',
  first_feeding_size: 'First feeding size',
  flexion_age: 'Flexion age',
  flexion_size: 'Flexion size',
  metamorphosis_age: 'Metamorphosis age',
  metamorphosis_size: 'Metamorphosis size',
  larval_growth: 'Age-at-length data',
  settlement_age: 'Settlement age',
  settlement_size: 'Settlement size',
  critical_swimming: 'Critical swimming',
  in_situ_swimming: 'In situ swimming',
  vertical_position: 'Vertical position',
  pelagic_juvenile: 'Pelagic juvenile',
  rafting: 'Rafting',
};

/**
 * Get display name for a database filename.
 */
function getTraitDisplayName(filename: string): string {
  for (const [pattern, name] of Object.entries(TRAIT_DISPLAY_NAMES)) {
    if (filename.includes(pattern)) return name;
  }
  return filename;
}

/**
 * Load publication year data from the reference data file.
 * Groups by 5-year bins and source category (Origin + Type).
 */
async function loadPublicationYears(): Promise<{ year: number; source: string; count: number; variable: string }[]> {
  // Try multiple paths: parent (dev), cwd (VPS), and data dir
  const refFilename = 'All references and publication dates.txt';
  const candidatePaths = [
    path.join(process.cwd(), '..', 'reference-data', refFilename),
    path.join(process.cwd(), 'reference-data', refFilename),
    path.join(process.cwd(), 'data', refFilename),
  ];

  let refPath: string | null = null;
  for (const candidate of candidatePaths) {
    try {
      await fs.access(candidate);
      refPath = candidate;
      break;
    } catch {
      // Try next path
    }
  }

  if (!refPath) {
    console.warn('[homepage-stats] Reference data file not found. Tried:', candidatePaths);
    return [];
  }

  try {
    const content = await fs.readFile(refPath, 'utf-8');
    console.log(`[homepage-stats] Loaded reference data from ${refPath} (${content.length} bytes)`);

    // Parse the @ delimited reference data
    interface RefRow {
      VARIABLE: string;
      ORIGIN: string;
      EXT_REF_DATE: string;
      REFERENCE_DATE: string;
      EXT_REF_UNIQUE: string;
      REFERENCE_UNIQUE: string;
    }

    const parseResult = Papa.parse<RefRow>(content, {
      delimiter: '@',
      header: true,
      skipEmptyLines: true,
      quoteChar: '"',
    });

    console.log(`[homepage-stats] Parsed ${parseResult.data.length} reference rows`);

    // Count unique references per VARIABLE × ORIGIN × TYPE × YEAR_BIN
    // This matches the R logic: deduplicate references within each variable,
    // then the frontend sums across variables for the "All dispersal traits" view.
    const binCounts = new Map<string, Set<string>>();

    for (const row of parseResult.data) {
      const variable = typeof row.VARIABLE === 'string' ? row.VARIABLE.trim() : '';
      if (!variable || variable === 'NA') continue;

      // Trim and clean origin value
      const rawOrigin = typeof row.ORIGIN === 'string' ? row.ORIGIN.trim() : '';
      const origin = rawOrigin === 'NA' || rawOrigin === '' ? 'Unrecorded' : rawOrigin;

      // Process original references (REFERENCE)
      const refDate = typeof row.REFERENCE_DATE === 'string' ? row.REFERENCE_DATE.trim() : '';
      if (refDate && refDate !== 'NA') {
        const year = parseInt(refDate, 10);
        if (!isNaN(year) && year >= 1800 && year <= 2030) {
          const bin = Math.floor(year / 5) * 5;
          const source = `Original\n${origin}`;
          const key = `${variable}|${bin}|${source}`;
          if (!binCounts.has(key)) binCounts.set(key, new Set());
          const refUnique = typeof row.REFERENCE_UNIQUE === 'string' ? row.REFERENCE_UNIQUE.trim() : '';
          if (refUnique && refUnique !== 'NA') {
            binCounts.get(key)!.add(refUnique);
          }
        }
      }

      // Process cited references (EXT_REF)
      const extRefDate = typeof row.EXT_REF_DATE === 'string' ? row.EXT_REF_DATE.trim() : '';
      if (extRefDate && extRefDate !== 'NA') {
        const year = parseInt(extRefDate, 10);
        if (!isNaN(year) && year >= 1800 && year <= 2030) {
          const bin = Math.floor(year / 5) * 5;
          const source = `Cited\n${origin}`;
          const key = `${variable}|${bin}|${source}`;
          if (!binCounts.has(key)) binCounts.set(key, new Set());
          const extRefUnique = typeof row.EXT_REF_UNIQUE === 'string' ? row.EXT_REF_UNIQUE.trim() : '';
          if (extRefUnique && extRefUnique !== 'NA') {
            binCounts.get(key)!.add(extRefUnique);
          }
        }
      }
    }

    // Convert to output format: one entry per VARIABLE × YEAR_BIN × SOURCE
    const result: { year: number; source: string; count: number; variable: string }[] = [];
    for (const [key, refs] of binCounts) {
      if (refs.size === 0) continue;
      const parts = key.split('|');
      const variable = parts[0];
      const yearStr = parts[1];
      const source = parts[2];
      result.push({
        year: parseInt(yearStr, 10),
        source,
        count: refs.size,
        variable,
      });
    }

    result.sort((a, b) => a.year - b.year || a.variable.localeCompare(b.variable) || a.source.localeCompare(b.source));
    console.log(`[homepage-stats] Publication data: ${result.length} bins across ${new Set(result.map(r => r.variable)).size} variables`);
    return result;
  } catch (error) {
    console.error('[homepage-stats] Error loading/parsing reference data:', error);
    return [];
  }
}

/**
 * GET /api/homepage-stats
 *
 * Returns barplot statistics per trait database and publication year data.
 */
export async function GET() {
  try {
    const [data, pubYearData] = await Promise.all([
      getOrLoadData(),
      loadPublicationYears(),
    ]);
    const registry = data.databaseRegistry;

    const stats = [];

    for (const [filename, speciesSet] of registry.databaseSpecies) {
      const records = registry.recordCounts.get(filename) ?? 0;
      const genera = new Set<string>();
      const families = new Set<string>();
      const orders = new Set<string>();

      for (const speciesName of speciesSet) {
        // Find species object by valid name
        for (const sp of data.species.values()) {
          if (sp.validName === speciesName) {
            genera.add(sp.genus);
            families.add(sp.family);
            orders.add(sp.order);
            break;
          }
        }
      }

      stats.push({
        traitName: getTraitDisplayName(filename),
        records,
        species: speciesSet.size,
        genus: genera.size,
        family: families.size,
        order: orders.size,
      });
    }

    // Sort by record count descending
    stats.sort((a, b) => b.records - a.records);

    // Count colored pictures (images) from ALL three metadata files
    let imageStats = null;
    try {
      const imageRegistry = await loadImageRegistry();
      const imageSpecies = new Set<string>();
      const imageGenera = new Set<string>();
      const imageFamilies = new Set<string>();
      const imageOrders = new Set<string>();
      let totalImages = 0;

      // 1. Species-level images from registry
      for (const [, images] of imageRegistry.imagesBySpecies) {
        totalImages += images.length;
        for (const img of images) {
          if (img.speciesName) {
            imageSpecies.add(img.speciesName);
            const genus = img.speciesName.split(' ')[0];
            if (genus) imageGenera.add(genus);
          }
          if (img.family) {
            imageFamilies.add(img.family);
            for (const sp of data.species.values()) {
              if (sp.family === img.family) {
                imageOrders.add(sp.order);
                break;
              }
            }
          }
        }
      }

      // 2. Genus-level and family-level images from their metadata files
      const imagesDir = path.join(process.cwd(), 'images');
      for (const metaFile of ['gen_ids_pics_metadata.txt', 'fam_ids_pics_metadata.txt']) {
        try {
          let content = await fs.readFile(path.join(imagesDir, metaFile), 'utf-8');
          const lines = content.split('\n');
          if (lines.length >= 2) {
            const headerFields = lines[0].split('@').length;
            for (let i = 1; i < Math.min(lines.length, 5); i++) {
              const line = lines[i].trim();
              if (!line) continue;
              if (line.split('@').length > headerFields) {
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
              totalImages++;
              const family = (row.FAMILY || '').replace(/^"|"$/g, '');
              const genus = (row.GENUS || '').replace(/^"|"$/g, '');
              const order = (row.ORDER || '').replace(/^"|"$/g, '');
              if (family) imageFamilies.add(family);
              if (genus) imageGenera.add(genus);
              if (order) imageOrders.add(order);
            },
          });
        } catch {
          // file not found — skip
        }
      }

      imageStats = {
        traitName: 'Colored pictures',
        records: totalImages,
        species: imageSpecies.size,
        genus: imageGenera.size,
        family: imageFamilies.size,
        order: imageOrders.size,
      };
    } catch (e) {
      console.warn('[homepage-stats] Could not load image stats:', e);
    }

    return NextResponse.json(
      { stats, publicationYears: pubYearData, imageStats },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error('Error computing homepage stats:', error);
    return NextResponse.json(
      { error: 'Failed to compute statistics' },
      { status: 500 }
    );
  }
}
