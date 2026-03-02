/**
 * Tests for Epic 9 Fix: No data missing from exported tables.
 *
 * Verifies that all trait data from database files is included in exports.
 * Specifically checks that yolk diameter data for Dascyllus aruanus appears.
 */
import { describe, it, expect } from 'vitest';

describe('Export missing data check', () => {
  it('Yolk diameter data for Dascyllus aruanus must appear in Egg export', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData(
      'dascyllus-aruanus',
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size', 'incubation_duration'],
      'species'
    );

    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    // Check that at least one row has TYPE = 'Yolk diameter'
    const yolkRows = rows!.filter(r => r.TYPE === 'Yolk diameter');
    expect(yolkRows.length).toBeGreaterThan(0);
    // Verify yolk diameter rows have numeric MEAN values
    for (const row of yolkRows) {
      expect(row.MEAN).not.toBe('NA');
      expect(typeof row.MEAN).toBe('number');
    }
  });

  it('All trait types in egg section should produce export rows when data exists', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Check each trait type individually to find any silent dropping
    const traitTypes = ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size', 'incubation_duration'];

    for (const traitType of traitTypes) {
      // Count species with data for this trait in the data store
      let speciesWithTrait = 0;
      for (const [, traits] of data.traitsBySpecies) {
        if (traits.some(t => t.traitType === traitType)) {
          speciesWithTrait++;
        }
      }

      if (speciesWithTrait === 0) continue;

      // Find a species with this trait data
      let testSpeciesId: string | null = null;
      for (const [speciesId, traits] of data.traitsBySpecies) {
        if (traits.some(t => t.traitType === traitType)) {
          testSpeciesId = speciesId;
          break;
        }
      }

      // Export should produce rows for this trait
      const rows = await getSectionExportData(testSpeciesId!, [traitType], 'species');
      expect(rows).not.toBeNull();
      expect(rows!.length).toBeGreaterThan(0);
    }
  });
});
