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

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error computing homepage stats:', error);
    return NextResponse.json(
      { error: 'Failed to compute statistics' },
      { status: 500 }
    );
  }
}
