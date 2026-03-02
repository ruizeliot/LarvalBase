/**
 * Test: Egg export must be in LONG format — no raw measurement columns.
 *
 * Raw columns like YOLK_SIZE_MEAN, OIL_GLOBULE_SIZE_MAX, EGG_L_MEAN etc.
 * must NOT appear. Their values go into TYPE + MEAN/MIN/MAX/CONF rows.
 * Only qualitative columns (EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE, etc.) remain.
 */
import { describe, it, expect } from 'vitest';

describe('Egg export long format (no raw measurement columns)', () => {
  it('should NOT include raw measurement columns like YOLK_SIZE_MEAN', async () => {
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
    expect(rows!.length).toBeGreaterThan(0);

    const cols = Object.keys(rows![0]);
    // Raw measurement columns must NOT be present
    const forbiddenCols = [
      'YOLK_SIZE_MEAN', 'YOLK_SIZE_MIN', 'YOLK_SIZE_MAX', 'YOLK_SIZE_MEAN_TYPE',
      'OIL_GLOBULE_SIZE_MEAN', 'OIL_GLOBULE_SIZE_MIN', 'OIL_GLOBULE_SIZE_MAX',
      'OIL_GLOBULE_SIZE_MEAN_TYPE',
      'YOLK_VOLUME_MEAN', 'YOLK_VOLUME_MIN', 'YOLK_VOLUME_MAX',
      'OIL_GLOBULE_VOLUME_MEAN', 'OIL_GLOBULE_VOLUME_MIN', 'OIL_GLOBULE_VOLUME_MAX',
      'EGG_L_MEAN', 'EGG_L_MAX', 'EGG_L_MIN',
      'EGG_W_MEAN', 'EGG_W_MAX', 'EGG_W_MIN',
      'EGG_DIAMETER_MEAN', 'EGG_DIAMETER_CONF', 'EGG_DIAMETER_MEAN_TYPE',
      'INCUBATION_GESTATION_HOUR_MAX', 'INCUBATION_GESTATION_HOUR_MEAN',
    ];
    for (const col of forbiddenCols) {
      expect(cols).not.toContain(col);
    }
  });

  it('should include qualitative columns like EGG_DETAILS and NB_OIL_GLOBULE', async () => {
    const { getSectionExportData } = await import('../section-export.service');
    const { getOrLoadData } = await import('@/lib/data/data-repository');
    const data = await getOrLoadData();

    let testSpeciesId: string | null = null;
    for (const [speciesId, traits] of data.traitsBySpecies) {
      const eggTraits = traits.filter(t => t.traitType === 'egg_diameter');
      for (const t of eggTraits) {
        const raw = t.metadata?.rawFields as Record<string, unknown> | undefined;
        if (raw && raw.NB_OIL_GLOBULE && raw.NB_OIL_GLOBULE !== 'NA') {
          testSpeciesId = speciesId;
          break;
        }
      }
      if (testSpeciesId) break;
    }
    if (!testSpeciesId) {
      console.warn('No egg data with NB_OIL_GLOBULE found — skipping');
      return;
    }

    const rows = await getSectionExportData(
      testSpeciesId,
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size'],
      'species'
    );
    expect(rows).not.toBeNull();

    const cols = Object.keys(rows![0]);
    // Qualitative columns SHOULD be present
    expect(cols).toContain('NB_OIL_GLOBULE');
  });

  it('yolk diameter values should appear as TYPE rows with MEAN values', async () => {
    const { getSectionExportData } = await import('../section-export.service');

    const rows = await getSectionExportData(
      'dascyllus-aruanus',
      ['egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size', 'incubation_duration'],
      'species'
    );
    expect(rows).not.toBeNull();

    // Yolk diameter data should be in TYPE column rows
    const yolkRows = rows!.filter(r => r.TYPE === 'Yolk diameter');
    expect(yolkRows.length).toBeGreaterThan(0);
    // Values in MEAN column, not in raw YOLK_SIZE_MEAN column
    for (const row of yolkRows) {
      expect(row).toHaveProperty('MEAN');
      expect(row.MEAN).not.toBe('NA');
    }
  });
});
