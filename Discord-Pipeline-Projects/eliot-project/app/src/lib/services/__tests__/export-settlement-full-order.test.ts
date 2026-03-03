/**
 * Test: Settlement export must have columns in database order.
 * After ORIGINAL_NAME: SAMPLING_DATES, START_DATE, END_DATE, ORIGIN, LATITUDE,
 * LONGITUDE, ARTICLE_GPS_COORD, APPROX_GPS, MARINE_ECOREGION, LOCATION, COUNTRY,
 * GEAR, OTOLITH, MAX_SIZE_PELAGIC_JUV, N, TYPE, then MEAN/MIN/MAX/CONF etc.
 *
 * ORIGIN/LOCATION/COUNTRY/GEAR must be placed in their database position,
 * not at the end like the generic export ordering.
 */
import { describe, it, expect } from 'vitest';

describe('Settlement export full column order', () => {
  it('Settlement columns should follow database order (ORIGIN before LATITUDE)', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'settlement_age' || t.traitType === 'settlement_size')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['settlement_age', 'settlement_size'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);

    // ORIGIN must come right after END_DATE, before LATITUDE
    const originIdx = cols.indexOf('ORIGIN');
    const latIdx = cols.indexOf('LATITUDE');
    const endDateIdx = cols.indexOf('END_DATE');
    expect(originIdx).not.toBe(-1);
    if (endDateIdx !== -1) {
      expect(originIdx).toBeGreaterThan(endDateIdx);
    }
    if (latIdx !== -1) {
      expect(originIdx).toBeLessThan(latIdx);
    }

    // LOCATION and COUNTRY must come before GEAR (database order)
    const locationIdx = cols.indexOf('LOCATION');
    const countryIdx = cols.indexOf('COUNTRY');
    const gearIdx = cols.indexOf('GEAR');
    if (locationIdx !== -1 && countryIdx !== -1 && gearIdx !== -1) {
      expect(locationIdx).toBeLessThan(countryIdx);
      expect(countryIdx).toBeLessThan(gearIdx);
    }

    // N must come before TYPE
    const nIdx = cols.indexOf('N');
    const typeIdx = cols.indexOf('TYPE');
    expect(nIdx).toBeLessThan(typeIdx);

    // GEAR must come before N
    if (gearIdx !== -1) {
      expect(gearIdx).toBeLessThan(nIdx);
    }
  });

  it('Settlement export should not have METHOD or REMARKS', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'settlement_age' || t.traitType === 'settlement_size')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['settlement_age', 'settlement_size'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    expect(cols).not.toContain('METHOD');
    expect(cols).not.toContain('REMARKS');
  });
});
