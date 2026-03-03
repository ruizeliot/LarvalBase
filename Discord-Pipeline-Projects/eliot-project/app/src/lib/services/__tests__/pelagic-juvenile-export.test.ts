/**
 * Tests for Pelagic juvenile export — uses database-specific column order.
 *
 * Export uses exact database columns (PELAGIC_JUV_SIZE_MEAN, etc.)
 * matching pel_juv_db_01_2026_final, NOT the generic normalized TYPE/MEAN format.
 */
import { describe, it, expect } from 'vitest';

describe('Pelagic juvenile export (database column format)', () => {
  it('should produce export rows for species with pelagic juvenile data', async () => {
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
    expect(rows!.length).toBeGreaterThan(0);
  });

  it('should use database-specific columns for pelagic juvenile export', async () => {
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

    // Should have database-specific columns (not normalized TYPE/MEAN)
    expect(cols).toContain('PELAGIC_JUV_SIZE_MEAN');
    expect(cols).toContain('PELAGIC_JUV_SIZE_MIN');
    expect(cols).toContain('PELAGIC_JUV_SIZE_MAX');
    expect(cols).toContain('PELAGIC_JUV_DURATION_MEAN');
    expect(cols).toContain('ORDER');
    expect(cols).toContain('FAMILY');

    // Should NOT have generic normalized columns
    expect(cols).not.toContain('TYPE');
    expect(cols).not.toContain('MEAN');
  });

  it('should have exact database column order for pelagic juvenile export', async () => {
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

    const expectedCols = [
      'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY',
      'ORIGINAL_NAME', 'KEY_WORD', 'N', 'LENGTH_TYPE',
      'PELAGIC_JUV_SIZE_MEAN', 'PELAGIC_JUV_SIZE_MIN', 'PELAGIC_JUV_SIZE_MAX',
      'PELAGIC_JUV_SIZE_CONF', 'PELAGIC_JUV_SIZE_MEAN_TYPE', 'PELAGIC_JUV_SIZE_CONF_TYPE',
      'PELAGIC_JUV_DURATION_MEAN', 'PELAGIC_JUV_DURATION_MIN', 'PELAGIC_JUV_DURATION_MAX',
      'PELAGIC_JUV_DURATION_CONF', 'PELAGIC_JUV_DURATION_MEAN_TYPE', 'PELAGIC_JUV_DURATION_CONF_TYPE',
      'REMARKS', 'EXT_REF', 'REFERENCE', 'LINK',
    ];
    expect(cols).toEqual(expectedCols);
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

    let countDuration = 0;
    for (const [, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'pelagic_juvenile_duration')) {
        countDuration++;
      }
    }
    expect(countDuration).toBeGreaterThan(0);
  });
});
