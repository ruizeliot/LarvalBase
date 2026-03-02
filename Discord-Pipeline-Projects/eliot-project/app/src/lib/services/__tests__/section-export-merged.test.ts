/**
 * Tests for Epic 9 Fix: Merged section export tables with TYPE column.
 *
 * When a section has multiple sub-panels, the export should produce a single
 * merged table with a TYPE column, normalized measurement columns, and
 * union-filled extra info columns.
 */
import { describe, it, expect } from 'vitest';

describe('Merged section export with TYPE column', () => {
  it('Metamorphosis section export should have TYPE column', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find a species with metamorphosis data
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      const hasMetAge = traits.some(t => t.traitType === 'metamorphosis_age');
      const hasMetSize = traits.some(t => t.traitType === 'metamorphosis_size');
      if (hasMetAge || hasMetSize) {
        testSpeciesId = speciesId;
        break;
      }
    }

    if (!testSpeciesId) {
      console.warn('No metamorphosis data found — skipping test');
      return;
    }

    const rows = await getSectionExportData(
      testSpeciesId,
      ['metamorphosis_age', 'metamorphosis_size'],
      'species'
    );

    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    // Every row should have TYPE column
    for (const row of rows!) {
      expect(row).toHaveProperty('TYPE');
      expect(['Metamorphosis age', 'Metamorphosis size']).toContain(row.TYPE);
    }
  });

  it('Merged export should have normalized MEAN/MIN/MAX columns', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find a species with metamorphosis data
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'metamorphosis_age')) {
        testSpeciesId = speciesId;
        break;
      }
    }

    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['metamorphosis_age', 'metamorphosis_size'],
      'species'
    );

    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    // Every row should have normalized measurement columns
    for (const row of rows!) {
      expect(row).toHaveProperty('MEAN');
      expect(row).toHaveProperty('MIN');
      expect(row).toHaveProperty('MAX');
    }
  });

  it('Merged export should NOT have Link or ROW_INDEX columns', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'metamorphosis_age')) {
        testSpeciesId = speciesId;
        break;
      }
    }

    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['metamorphosis_age', 'metamorphosis_size'],
      'species'
    );

    expect(rows).not.toBeNull();
    for (const row of rows!) {
      expect(row).not.toHaveProperty('LINK');
      expect(row).not.toHaveProperty('ROW_INDEX');
    }
  });

  it('All rows should have the same set of columns (union-filled)', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'metamorphosis_age')) {
        testSpeciesId = speciesId;
        break;
      }
    }

    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['metamorphosis_age', 'metamorphosis_size'],
      'family'
    );

    if (!rows || rows.length < 2) return;

    // All rows should have identical column sets
    const firstCols = Object.keys(rows[0]);
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(firstCols);
    }
  });
});
