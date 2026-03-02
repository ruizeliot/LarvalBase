/**
 * Tests for Epic 9 Fix: Column order in exported tables.
 *
 * Rules:
 * 1. TYPE column first (after taxonomy)
 * 2. MEAN_TYPE, CONF_TYPE, UNIT immediately after MEAN, MIN, MAX, CONF
 * 3. TEMPERATURE_MEAN_TYPE, TEMPERATURE_CONF_TYPE after TEMPERATURE_MEAN/MIN/MAX/CONF
 * 4. REMARKS, EXT_REF, REFERENCE, LINK always LAST
 */
import { describe, it, expect } from 'vitest';

describe('Export column order', () => {
  it('MEAN_TYPE, CONF_TYPE, UNIT should follow immediately after MEAN/MIN/MAX/CONF', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find any species with egg data
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'egg_diameter')) {
        testSpeciesId = speciesId;
        break;
      }
    }

    if (!testSpeciesId) {
      console.warn('No egg data found — skipping test');
      return;
    }

    const rows = await getSectionExportData(testSpeciesId, ['egg_diameter'], 'species');
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    const cols = Object.keys(rows![0]);
    const confIdx = cols.indexOf('CONF');
    const meanTypeIdx = cols.indexOf('MEAN_TYPE');
    const confTypeIdx = cols.indexOf('CONF_TYPE');
    const unitIdx = cols.indexOf('UNIT');

    // MEAN_TYPE, CONF_TYPE, UNIT must come right after CONF
    expect(meanTypeIdx).toBe(confIdx + 1);
    expect(confTypeIdx).toBe(confIdx + 2);
    expect(unitIdx).toBe(confIdx + 3);
  });

  it('TEMPERATURE_MEAN_TYPE and TEMPERATURE_CONF_TYPE should follow TEMPERATURE columns', async () => {
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
    const tempConfIdx = cols.indexOf('TEMPERATURE_CONF');
    const tempMeanTypeIdx = cols.indexOf('TEMPERATURE_MEAN_TYPE');
    const tempConfTypeIdx = cols.indexOf('TEMPERATURE_CONF_TYPE');

    // TEMPERATURE_MEAN_TYPE should follow TEMPERATURE_CONF
    expect(tempMeanTypeIdx).toBe(tempConfIdx + 1);
    // TEMPERATURE_CONF_TYPE should follow TEMPERATURE_MEAN_TYPE
    expect(tempConfTypeIdx).toBe(tempConfIdx + 2);
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

    // Last 4 columns should be REMARKS, EXT_REF, REFERENCE, LINK in this order
    expect(cols[len - 4]).toBe('REMARKS');
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
