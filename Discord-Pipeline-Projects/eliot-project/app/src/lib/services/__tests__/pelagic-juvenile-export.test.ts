/**
 * Tests for Epic 9 Fix: Pelagic juvenile export produces data.
 *
 * Verifies that pelagic juvenile size and duration traits are
 * correctly extracted from the database and appear in exports.
 */
import { describe, it, expect } from 'vitest';

describe('Pelagic juvenile export', () => {
  it('should produce export rows for species with pelagic juvenile data', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find a species with pelagic_juvenile_size data
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'pelagic_juvenile_size')) {
        testSpeciesId = speciesId;
        break;
      }
    }

    // There must be species with pelagic juvenile data
    expect(testSpeciesId).not.toBeNull();

    const rows = await getSectionExportData(
      testSpeciesId!,
      ['pelagic_juvenile_size', 'pelagic_juvenile_duration'],
      'species'
    );

    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);
  });

  it('should use original database column order for pelagic juvenile export', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'pelagic_juvenile_size')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    expect(testSpeciesId).not.toBeNull();

    const rows = await getSectionExportData(
      testSpeciesId!,
      ['pelagic_juvenile_size', 'pelagic_juvenile_duration'],
      'species'
    );

    expect(rows).not.toBeNull();
    const cols = Object.keys(rows![0]);

    // Should NOT have normalized MEAN/MIN/MAX/CONF columns
    expect(cols).not.toContain('MEAN');
    expect(cols).not.toContain('TYPE');

    // Should have original database columns
    expect(cols).toContain('PELAGIC_JUV_SIZE_MEAN');
    expect(cols).toContain('ORDER');
    expect(cols).toContain('FAMILY');
  });

  it('Gadus morhua should have pelagic juvenile export data', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData(
      'gadus-morhua',
      ['pelagic_juvenile_size', 'pelagic_juvenile_duration'],
      'species'
    );

    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);
  });

  it('pelagic_juvenile_duration traits should be extracted from database', async () => {
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Count species with pelagic_juvenile_duration
    let countDuration = 0;
    for (const [, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'pelagic_juvenile_duration')) {
        countDuration++;
      }
    }

    // The database has PELAGIC_JUV_DURATION_MEAN column with data
    // so there should be at least some species with duration data
    expect(countDuration).toBeGreaterThan(0);
  });
});
