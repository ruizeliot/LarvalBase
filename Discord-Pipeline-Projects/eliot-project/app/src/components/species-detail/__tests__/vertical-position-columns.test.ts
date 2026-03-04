/**
 * Tests for vertical position enlarged table column definitions.
 */
import { describe, it, expect } from 'vitest';

describe('vertical position enlarged table columns', () => {
  it('should have exact columns in the specified order', async () => {
    const { VERTICAL_DISTRIBUTION_COLUMNS } = await import('../raw-data-modal');

    const expectedLabels = [
      'Name', 'Location', 'Gear', 'Period', 'Zone', 'Stage',
      'Island position', 'Depth fished', 'N', 'Mean', 'Min', 'Max', 'SD',
      'Weighting', 'External references', 'Main reference',
    ];

    const actualLabels = VERTICAL_DISTRIBUTION_COLUMNS.map((c: { label: string }) => c.label);
    expect(actualLabels).toEqual(expectedLabels);
  });

  it('should have REFERENCE as hyperlink column', async () => {
    const { VERTICAL_DISTRIBUTION_COLUMNS } = await import('../raw-data-modal');

    const refCol = VERTICAL_DISTRIBUTION_COLUMNS.find((c: { key: string }) => c.key === 'REFERENCE');
    expect(refCol).toBeDefined();
    expect(refCol!.isReference).toBe(true);
    expect(refCol!.linkField).toBe('LINK');
  });

  it('should map to correct CSV field names', async () => {
    const { VERTICAL_DISTRIBUTION_COLUMNS } = await import('../raw-data-modal');

    const expectedFields = [
      'VALID_NAME', 'LOCATION', 'GEAR', 'PERIOD', 'ZONE', 'STAGE',
      'POSITION_ISLAND', 'DEPTH_INTERVAL_CONSIDERED', 'N_CAPTURE',
      'WEIGHTED_MEAN_DEPTH_CAPTURE', 'MIN_DEPTH_CAPTURE', 'MAX_DEPTH_CAPTURE',
      'WEIGHTED_SD_DEPTH_CAPTURE', 'WEIGHTING_DETAILS', 'EXT_REF', 'REFERENCE',
    ];

    const actualFields = VERTICAL_DISTRIBUTION_COLUMNS.map((c: { csvField: string }) => c.csvField);
    expect(actualFields).toEqual(expectedFields);
  });
});
