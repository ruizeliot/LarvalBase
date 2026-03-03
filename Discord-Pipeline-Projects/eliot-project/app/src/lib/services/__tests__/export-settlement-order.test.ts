/**
 * Test: Settlement export column order per task instructions.
 * After ORIGINAL_NAME: SAMPLING_DATES, START_DATE, END_DATE, ORIGIN, LATITUDE,
 * LONGITUDE, ARTICLE_GPS_COORD, APPROX_GPS, MARINE_ECOREGION, LOCATION, COUNTRY,
 * GEAR, OTOLITH, MAX_SIZE_PELAGIC_JUV, N, TYPE, then MEAN/MIN/MAX/CONF etc.
 */
import { describe, it, expect } from 'vitest';

describe('Settlement export column order', () => {
  it('N should come before TYPE in settlement export', async () => {
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
    const nIdx = cols.indexOf('N');
    const typeIdx = cols.indexOf('TYPE');
    expect(nIdx).not.toBe(-1);
    expect(typeIdx).not.toBe(-1);
    expect(nIdx).toBeLessThan(typeIdx);
  });

  it('LENGTH_TYPE should come after UNIT in settlement size export', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'settlement_size')) {
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
    const unitIdx = cols.indexOf('UNIT');
    const lengthTypeIdx = cols.indexOf('LENGTH_TYPE');
    if (lengthTypeIdx === -1) return; // may not be present if only settlement_age data
    expect(lengthTypeIdx).toBeGreaterThan(unitIdx);
  });
});
