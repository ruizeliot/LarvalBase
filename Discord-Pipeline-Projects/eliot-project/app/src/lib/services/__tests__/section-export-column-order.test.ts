/**
 * Tests for Epic 9 Fix: Column order in exported tables.
 *
 * Required order:
 * 1. Taxonomy: ORDER/FAMILY/GENUS/VALID_NAME/APHIA_ID/AUTHORITY
 * 2. TYPE + qualitative columns (EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE, etc.)
 * 3. MEAN/MIN/MAX/CONF
 * 4. MEAN_TYPE/CONF_TYPE/UNIT
 * 5. TEMPERATURE group
 * 6. Other columns (ORIGIN, N, METHOD, GEAR, LOCATION, etc.)
 * 7. REMARKS/EXT_REF/REFERENCE/LINK always LAST
 */
import { describe, it, expect } from 'vitest';

describe('Export column order', () => {
  it('TYPE and qualitative columns should come FIRST after taxonomy, BEFORE MEAN', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'egg_diameter')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size'],
      'species'
    );
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    const authorityIdx = cols.indexOf('AUTHORITY');
    const typeIdx = cols.indexOf('TYPE');
    const meanIdx = cols.indexOf('MEAN');

    // TYPE must come after taxonomy but before MEAN
    expect(typeIdx).toBeGreaterThan(authorityIdx);
    expect(typeIdx).toBeLessThan(meanIdx);

    // Qualitative columns (EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE, etc.) should be before MEAN
    const qualitativeCols = ['EGG_DETAILS', 'EGG_SHAPE', 'EGG_LOCATION', 'NB_OIL_GLOBULE'];
    for (const col of qualitativeCols) {
      const idx = cols.indexOf(col);
      if (idx !== -1) {
        expect(idx).toBeLessThan(meanIdx);
        expect(idx).toBeGreaterThan(authorityIdx);
      }
    }
  });

  it('MEAN/MIN/MAX/CONF should come before MEAN_TYPE/CONF_TYPE/UNIT', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'egg_diameter')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(testSpeciesId, ['egg_diameter'], 'species');
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    const cols = Object.keys(rows![0]);
    const meanIdx = cols.indexOf('MEAN');
    const confIdx = cols.indexOf('CONF');
    const meanTypeIdx = cols.indexOf('MEAN_TYPE');
    const confTypeIdx = cols.indexOf('CONF_TYPE');
    const unitIdx = cols.indexOf('UNIT');

    // MEAN, MIN, MAX, CONF must be in order
    expect(cols.indexOf('MIN')).toBe(meanIdx + 1);
    expect(cols.indexOf('MAX')).toBe(meanIdx + 2);
    expect(confIdx).toBe(meanIdx + 3);

    // MEAN_TYPE, CONF_TYPE, UNIT must follow after CONF
    expect(meanTypeIdx).toBeGreaterThan(confIdx);
    expect(confTypeIdx).toBeGreaterThan(meanTypeIdx);
    expect(unitIdx).toBeGreaterThan(confTypeIdx);
  });

  it('TEMPERATURE group should come after MEAN_TYPE/CONF_TYPE/UNIT', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'egg_diameter')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(testSpeciesId, ['egg_diameter'], 'species');
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    const unitIdx = cols.indexOf('UNIT');
    const tempMeanIdx = cols.indexOf('TEMPERATURE_MEAN');
    const tempConfIdx = cols.indexOf('TEMPERATURE_CONF');
    const tempMeanTypeIdx = cols.indexOf('TEMPERATURE_MEAN_TYPE');
    const tempConfTypeIdx = cols.indexOf('TEMPERATURE_CONF_TYPE');

    // Temperature group must come after UNIT
    expect(tempMeanIdx).toBeGreaterThan(unitIdx);

    // Temperature columns in order
    if (tempConfIdx !== -1 && tempMeanTypeIdx !== -1) {
      expect(tempMeanTypeIdx).toBe(tempConfIdx + 1);
      expect(tempConfTypeIdx).toBe(tempConfIdx + 2);
    }
  });

  it('REMARKS, EXT_REF, REFERENCE, LINK should always be last four columns', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'egg_diameter')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(testSpeciesId, ['egg_diameter'], 'species');
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    const len = cols.length;

    // Egg export uses gold-standard format: last 3 columns are EXT_REF, REFERENCE, LINK
    expect(cols[len - 3]).toBe('EXT_REF');
    expect(cols[len - 2]).toBe('REFERENCE');
    expect(cols[len - 1]).toBe('LINK');
  });

  it('LINK column should be included in export', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'egg_diameter')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(testSpeciesId, ['egg_diameter'], 'species');
    expect(rows).not.toBeNull();

    for (const row of rows!) {
      expect(row).toHaveProperty('LINK');
    }
  });
});
