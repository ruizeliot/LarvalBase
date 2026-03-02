/**
 * Tests for Pelagic juvenile export — now uses long format with TYPE column.
 *
 * Previously used raw database column order. Now normalized like all other sections.
 */
import { describe, it, expect } from 'vitest';

describe('Pelagic juvenile export (long format)', () => {
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

  it('should use long format with TYPE and MEAN columns for pelagic juvenile', async () => {
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

    // Should have normalized TYPE and MEAN/MIN/MAX/CONF columns
    expect(cols).toContain('TYPE');
    expect(cols).toContain('MEAN');
    expect(cols).toContain('MIN');
    expect(cols).toContain('MAX');
    expect(cols).toContain('CONF');
    expect(cols).toContain('ORDER');
    expect(cols).toContain('FAMILY');

    // TYPE values should be pelagic juvenile labels
    for (const row of rows!) {
      expect(['Pelagic juvenile size', 'Pelagic juvenile duration']).toContain(row.TYPE);
    }
  });

  it('should NOT include raw database columns like PELAGIC_JUV_SIZE_MEAN', async () => {
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
    // Raw measurement columns should NOT be present
    expect(cols).not.toContain('PELAGIC_JUV_SIZE_MEAN');
    expect(cols).not.toContain('PELAGIC_JUV_DURATION_MEAN');
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
