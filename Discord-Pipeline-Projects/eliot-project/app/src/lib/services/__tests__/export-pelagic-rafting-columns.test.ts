/**
 * Test: Pelagic juvenile + rafting exports should show filtered tables
 * with the SAME columns as the records table (no extra columns).
 *
 * Pelagic juvenile size columns: KEY_WORD, N, LENGTH_TYPE, PELAGIC_JUV_SIZE_MEAN_TYPE, PELAGIC_JUV_SIZE_CONF_TYPE, REMARKS
 * Pelagic juvenile duration columns: KEY_WORD, N, PELAGIC_JUV_DURATION_MEAN_TYPE, PELAGIC_JUV_DURATION_CONF_TYPE, REMARKS
 * Rafting size columns: FLOATSAM, STAGE, LENGTH_TYPE, RAFTING_SIZE_MEAN_TYPE
 * Rafting behavior columns: FLOATSAM, STAGE
 */
import { describe, it, expect } from 'vitest';

describe('Pelagic juvenile + rafting export columns', () => {
  it('Pelagic juvenile export should NOT have ORIGIN, METHOD, GEAR, LOCATION', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'pelagic_juvenile_size' || t.traitType === 'pelagic_juvenile_duration')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['pelagic_juvenile_size', 'pelagic_juvenile_duration'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    expect(cols).not.toContain('ORIGIN');
    expect(cols).not.toContain('METHOD');
    expect(cols).not.toContain('GEAR');
    expect(cols).not.toContain('LOCATION');
  });

  it('Rafting export should NOT have ORIGIN, N, METHOD, GEAR, LOCATION, REMARKS', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'rafting_size' || t.traitType === 'rafting_behavior')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['rafting_size', 'rafting_behavior'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    expect(cols).not.toContain('ORIGIN');
    expect(cols).not.toContain('METHOD');
    expect(cols).not.toContain('GEAR');
    expect(cols).not.toContain('LOCATION');
    expect(cols).not.toContain('REMARKS');
  });
});
