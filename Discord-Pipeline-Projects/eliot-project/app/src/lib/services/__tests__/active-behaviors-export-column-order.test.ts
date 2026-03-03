/**
 * Test: Active Behaviors export column order.
 *
 * ORIGIN and LOCATION must be placed RIGHT AFTER ORIGINAL_NAME
 * in the Active Behaviors section export table.
 */
import { describe, it, expect } from 'vitest';

const ACTIVE_BEHAVIORS_TRAITS = [
  'vertical_distribution',
  'critical_swimming_speed',
  'critical_swimming_speed_rel',
  'in_situ_swimming_speed',
  'in_situ_swimming_speed_rel',
];

describe('Active Behaviors export column order', () => {
  it('ORIGIN and LOCATION should come right after ORIGINAL_NAME', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find a species with active behaviors traits
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => ACTIVE_BEHAVIORS_TRAITS.includes(t.traitType))) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ACTIVE_BEHAVIORS_TRAITS,
      'species'
    );
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    const cols = Object.keys(rows![0]);
    const originalNameIdx = cols.indexOf('ORIGINAL_NAME');
    expect(originalNameIdx).toBeGreaterThan(-1);

    // ORIGIN and LOCATION must be the next columns after ORIGINAL_NAME
    // (in whatever order they appear, but both must be before TYPE)
    const originIdx = cols.indexOf('ORIGIN');
    const locationIdx = cols.indexOf('LOCATION');
    const typeIdx = cols.indexOf('TYPE');

    // At least one of ORIGIN/LOCATION should exist for active behaviors
    const hasOrigin = originIdx !== -1;
    const hasLocation = locationIdx !== -1;
    expect(hasOrigin || hasLocation).toBe(true);

    if (hasOrigin) {
      // ORIGIN must come right after ORIGINAL_NAME (before TYPE and measurements)
      expect(originIdx).toBeGreaterThan(originalNameIdx);
      expect(originIdx).toBeLessThan(typeIdx);
      // Must be within the first few columns after ORIGINAL_NAME
      expect(originIdx - originalNameIdx).toBeLessThanOrEqual(2);
    }

    if (hasLocation) {
      // LOCATION must come right after ORIGINAL_NAME (before TYPE and measurements)
      expect(locationIdx).toBeGreaterThan(originalNameIdx);
      expect(locationIdx).toBeLessThan(typeIdx);
      // Must be within the first few columns after ORIGINAL_NAME
      expect(locationIdx - originalNameIdx).toBeLessThanOrEqual(2);
    }
  });
});
