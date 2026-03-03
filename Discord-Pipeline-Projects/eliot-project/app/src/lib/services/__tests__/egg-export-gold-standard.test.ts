/**
 * Test: Egg export matches gold standard (example_dascyllus_aruanus.csv).
 * Verifies column order, TYPE values, and no forbidden columns.
 */
import { describe, it, expect } from 'vitest';

const EGG_TRAIT_KEYS = ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size', 'incubation_duration'];

const EXPECTED_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME',
  'EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE',
  'TYPE', 'MEAN', 'MIN', 'MAX', 'CONF', 'MEAN_TYPE', 'CONF_TYPE', 'VOLUME_TYPE', 'UNIT',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_MEAN_TYPE',
  'EXT_REF', 'REFERENCE', 'LINK',
];

const FORBIDDEN_COLUMNS = [
  'ORIGIN', 'N', 'LENGTH_TYPE', 'METHOD', 'GEAR', 'LOCATION', 'REMARKS',
  'TEMPERATURE_CONF', 'TEMPERATURE_CONF_TYPE',
];

describe('Egg export gold standard format', () => {
  it('should have exact column order matching gold standard', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    const cols = Object.keys(rows![0]);
    expect(cols).toEqual(EXPECTED_COLUMNS);
  });

  it('should NOT include forbidden columns (ORIGIN, N, METHOD, GEAR, etc.)', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    for (const forbidden of FORBIDDEN_COLUMNS) {
      expect(cols).not.toContain(forbidden);
    }
  });

  it('should have Egg length and Egg width TYPE rows', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();

    const types = [...new Set(rows!.map(r => r.TYPE))];
    expect(types).toContain('Egg length');
    expect(types).toContain('Egg width');
  });

  it('should have Incubation duration TYPE rows', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();

    const types = [...new Set(rows!.map(r => r.TYPE))];
    expect(types).toContain('Incubation duration');
  });

  it('should include ORIGINAL_NAME column', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    expect(cols).toContain('ORIGINAL_NAME');

    // Check that it has actual values
    const withOrigName = rows!.filter(r => r.ORIGINAL_NAME && r.ORIGINAL_NAME !== 'NA');
    expect(withOrigName.length).toBeGreaterThan(0);
  });

  it('should have VOLUME_TYPE column between CONF_TYPE and UNIT', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    const confTypeIdx = cols.indexOf('CONF_TYPE');
    const volumeTypeIdx = cols.indexOf('VOLUME_TYPE');
    const unitIdx = cols.indexOf('UNIT');

    expect(volumeTypeIdx).toBe(confTypeIdx + 1);
    expect(unitIdx).toBe(volumeTypeIdx + 1);
  });

  it('should include EGG_LOCATION before EGG_DETAILS', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData('dascyllus-aruanus', EGG_TRAIT_KEYS, 'species');
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    const locationIdx = cols.indexOf('EGG_LOCATION');
    const detailsIdx = cols.indexOf('EGG_DETAILS');
    expect(locationIdx).toBeLessThan(detailsIdx);
  });
});
