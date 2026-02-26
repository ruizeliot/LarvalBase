import { NextResponse } from 'next/server';
import { getOrLoadData } from '@/lib/data/data-repository';

/**
 * Trait display names for the barplots.
 * Maps database filename patterns to human-readable trait names.
 */
const TRAIT_DISPLAY_NAMES: Record<string, string> = {
  egg_database: 'Egg traits',
  hatching_size: 'Hatching size',
  incubation: 'Incubation',
  first_feeding_age: 'First feeding age',
  first_feeding_size: 'First feeding size',
  flexion_age: 'Flexion age',
  flexion_size: 'Flexion size',
  metamorphosis_age: 'Metamorphosis age',
  metamorphosis_size: 'Metamorphosis size',
  larval_growth: 'Growth curves',
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
 * GET /api/homepage-stats
 *
 * Returns barplot statistics per trait database:
 * - records: total row count
 * - species: unique VALID_NAME count
 * - genus: unique genus count
 * - family: unique family count
 * - order: unique order count
 */
export async function GET() {
  try {
    const data = await getOrLoadData();
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

    // Compute publication year & origin data from trait references
    const pubYearData: { year: number; source: string; count: number }[] = [];
    const yearSourceCounts = new Map<string, number>();

    for (const [filename, speciesSet] of registry.databaseSpecies) {
      const displayName = getTraitDisplayName(filename);

      // Count records per year extracted from references
      for (const traits of data.traitsBySpecies.values()) {
        for (const trait of traits) {
          if (!trait.source) continue;
          // Extract year from reference string (e.g., "Smith et al. 2015")
          const yearMatch = trait.source.match(/\b(19|20)\d{2}\b/);
          if (!yearMatch) continue;
          const year = parseInt(yearMatch[0], 10);
          const key = `${year}|${displayName}`;
          yearSourceCounts.set(key, (yearSourceCounts.get(key) ?? 0) + 1);
        }
      }
    }

    // Deduplicate: aggregate by year and source category
    const yearAgg = new Map<string, number>();
    for (const [key, count] of yearSourceCounts) {
      const [yearStr] = key.split('|');
      const year = parseInt(yearStr, 10);
      // Bin sources into major categories
      const binKey = `${year}|Database`;
      yearAgg.set(binKey, (yearAgg.get(binKey) ?? 0) + count);
    }

    for (const [key, count] of yearAgg) {
      const [yearStr, source] = key.split('|');
      pubYearData.push({ year: parseInt(yearStr, 10), source, count });
    }

    pubYearData.sort((a, b) => a.year - b.year);

    return NextResponse.json({ stats, publicationYears: pubYearData });
  } catch (error) {
    console.error('Error computing homepage stats:', error);
    return NextResponse.json(
      { error: 'Failed to compute statistics' },
      { status: 500 }
    );
  }
}
