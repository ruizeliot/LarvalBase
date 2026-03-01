/**
 * Tests for Epic 0 Fix: EXT_REF column in Growth Models CSV export.
 *
 * The Growth Models database has an EXT_REF column that must be:
 * 1. Parsed into the GrowthModel type
 * 2. Included in the model CSV export output
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

describe('Growth Models EXT_REF column', () => {
  it('Growth Models database should have EXT_REF column in header', async () => {
    const dbPath = path.join(
      process.cwd(),
      'database',
      'Growth model parameters database final 06.2025.txt'
    );
    const content = await fs.readFile(dbPath, 'utf-8');
    const headerLine = content.split('\n')[0];
    const headers = headerLine.split('@').map(h => h.replace(/^"|"$/g, '').trim());
    expect(headers).toContain('EXT_REF');
  });

  it('GrowthModel type should include extRef field', async () => {
    // Dynamically import to check the type at runtime through the service
    const { loadGrowthModels } = await import('../growth.service');
    const models = await loadGrowthModels();

    if (models.length > 0) {
      // The first model should have an extRef property (even if null)
      expect(models[0]).toHaveProperty('extRef');
    }
  });

  it('Growth model export should include External references column', async () => {
    const { getGrowthModelExportData, loadGrowthModels } = await import('../growth.service');
    const models = await loadGrowthModels();

    if (models.length > 0) {
      const speciesId = models[0].speciesId;
      const exportData = await getGrowthModelExportData(speciesId);

      if (exportData.length > 0) {
        expect(exportData[0]).toHaveProperty('External references');
      }
    }
  });
});
