/**
 * Test: Export tables must NOT include columns not listed in columns_per_type.txt.
 * Specifically: ORIGIN, METHOD, GEAR, LOCATION, REMARKS must NOT appear
 * unless explicitly listed for that TYPE.
 */
import { describe, it, expect } from 'vitest';

describe('Export disallowed columns per trait type', () => {
  it('Hatching export should NOT have ORIGIN, METHOD, GEAR, LOCATION, REMARKS', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'hatching_size')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['hatching_size', 'first_feeding_age', 'first_feeding_size', 'yolk_absorption_age', 'yolk_absorbed_size'],
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
    expect(cols).not.toContain('LENGTH_TYPE');
  });

  it('Flexion export should have N but NOT ORIGIN, METHOD, GEAR, LOCATION, REMARKS', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'flexion_size')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['flexion_age', 'flexion_size'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    expect(cols).toContain('N');
    expect(cols).not.toContain('ORIGIN');
    expect(cols).not.toContain('METHOD');
    expect(cols).not.toContain('GEAR');
    expect(cols).not.toContain('LOCATION');
    expect(cols).not.toContain('REMARKS');
  });

  it('Metamorphosis export should have N but NOT METHOD, GEAR, LOCATION, REMARKS', async () => {
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
      ['metamorphosis_age', 'metamorphosis_size', 'metamorphosis_duration'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    expect(cols).toContain('N');
    expect(cols).not.toContain('METHOD');
    expect(cols).not.toContain('GEAR');
    expect(cols).not.toContain('LOCATION');
    expect(cols).not.toContain('REMARKS');
  });

  it('Swimming speed export should NOT have METHOD, GEAR', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      if (traits.some(t => t.traitType === 'critical_swimming_speed' || t.traitType === 'in_situ_swimming_speed')) {
        testSpeciesId = speciesId;
        break;
      }
    }
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['critical_swimming_speed', 'critical_swimming_speed_rel', 'in_situ_swimming_speed', 'in_situ_swimming_speed_rel', 'vertical_distribution'],
      'species'
    );
    expect(rows).not.toBeNull();
    if (!rows || rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    expect(cols).not.toContain('METHOD');
    expect(cols).not.toContain('GEAR');
  });
});
