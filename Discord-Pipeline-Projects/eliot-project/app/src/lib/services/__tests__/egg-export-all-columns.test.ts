/**
 * Test: Egg export must include ALL columns from the source database,
 * including yolk and oil globule measurement columns.
 *
 * BUG 2: YOLK_SIZE_MEAN, OIL_GLOBULE_SIZE_MEAN etc. were excluded by
 * MEASUREMENT_COL_REGEX which treated them as already-normalized columns.
 */
import { describe, it, expect } from 'vitest';

describe('Egg export includes all source columns', () => {
  it('should include YOLK_SIZE columns in egg export', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find a species with egg data that has yolk size data in rawFields
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      const eggTraits = traits.filter(t => t.traitType === 'egg_diameter');
      for (const t of eggTraits) {
        const raw = t.metadata?.rawFields as Record<string, unknown> | undefined;
        if (raw && raw.YOLK_SIZE_MEAN && raw.YOLK_SIZE_MEAN !== 'NA') {
          testSpeciesId = speciesId;
          break;
        }
      }
      if (testSpeciesId) break;
    }

    if (!testSpeciesId) {
      console.warn('No egg data with yolk size found — skipping');
      return;
    }

    const rows = await getSectionExportData(
      testSpeciesId,
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size'],
      'species'
    );
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);

    // All rows should have these columns (union-filled)
    const cols = Object.keys(rows![0]);
    expect(cols).toContain('YOLK_SIZE_MEAN');
    expect(cols).toContain('YOLK_SIZE_MIN');
    expect(cols).toContain('YOLK_SIZE_MAX');
    expect(cols).toContain('YOLK_SIZE_MEAN_TYPE');
  });

  it('should include OIL_GLOBULE columns in egg export', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    // Find species with oil globule data
    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      const eggTraits = traits.filter(t => t.traitType === 'egg_diameter');
      for (const t of eggTraits) {
        const raw = t.metadata?.rawFields as Record<string, unknown> | undefined;
        if (raw && raw.OIL_GLOBULE_SIZE_MEAN && raw.OIL_GLOBULE_SIZE_MEAN !== 'NA') {
          testSpeciesId = speciesId;
          break;
        }
      }
      if (testSpeciesId) break;
    }

    if (!testSpeciesId) {
      console.warn('No egg data with oil globule size found — skipping');
      return;
    }

    const rows = await getSectionExportData(
      testSpeciesId,
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size'],
      'species'
    );
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    expect(cols).toContain('OIL_GLOBULE_SIZE_MEAN');
    expect(cols).toContain('OIL_GLOBULE_SIZE_MIN');
    expect(cols).toContain('OIL_GLOBULE_SIZE_MAX');
    expect(cols).toContain('OIL_GLOBULE_SIZE_MEAN_TYPE');
    expect(cols).toContain('NB_OIL_GLOBULE');
  });

  it('should include YOLK_VOLUME and OIL_GLOBULE_VOLUME columns', async () => {
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
    if (!testSpeciesId) return;

    const rows = await getSectionExportData(
      testSpeciesId,
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size'],
      'species'
    );
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    // These columns exist in the source egg database and must be exported
    expect(cols).toContain('YOLK_VOLUME_MEAN');
    expect(cols).toContain('YOLK_VOLUME_MIN');
    expect(cols).toContain('YOLK_VOLUME_MAX');
    expect(cols).toContain('YOLK_VOLUME_TYPE');
    expect(cols).toContain('OIL_GLOBULE_VOLUME_MEAN');
    expect(cols).toContain('OIL_GLOBULE_VOLUME_MIN');
    expect(cols).toContain('OIL_GLOBULE_VOLUME_MAX');
    expect(cols).toContain('OIL_GLOBULE_VOLUME_TYPE');
  });
});
