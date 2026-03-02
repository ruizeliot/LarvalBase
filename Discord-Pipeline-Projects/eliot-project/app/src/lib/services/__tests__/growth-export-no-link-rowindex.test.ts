/**
 * Tests for Epic 9 Fix: Remove Link and ROW_INDEX from AGE-AT-LENGTH export.
 *
 * The age-at-length CSV export should NOT include 'Link' or 'ROW_INDEX' columns.
 */
import { describe, it, expect } from 'vitest';

describe('Age-at-length export excludes Link and ROW_INDEX', () => {
  it('getRawGrowthExportData should NOT include Link column', async () => {
    const { getRawGrowthExportData, loadRawGrowthData } = await import('../growth.service');
    const allData = await loadRawGrowthData();

    // Find a species with data
    const firstSpeciesId = allData.keys().next().value;
    if (!firstSpeciesId) {
      console.warn('No raw growth data found — skipping test');
      return;
    }

    const exportData = await getRawGrowthExportData(firstSpeciesId);
    expect(exportData.length).toBeGreaterThan(0);

    for (const row of exportData) {
      expect(row).not.toHaveProperty('Link');
      expect(row).not.toHaveProperty('ROW_INDEX');
    }
  });

  it('getRawGrowthExportData should include Main reference column', async () => {
    const { getRawGrowthExportData, loadRawGrowthData } = await import('../growth.service');
    const allData = await loadRawGrowthData();

    const firstSpeciesId = allData.keys().next().value;
    if (!firstSpeciesId) return;

    const exportData = await getRawGrowthExportData(firstSpeciesId);
    expect(exportData.length).toBeGreaterThan(0);
    expect(exportData[0]).toHaveProperty('Main reference');
  });
});
