/**
 * Tests for vertical position CSV export matching original database columns.
 */
import { describe, it, expect } from 'vitest';

// The original database columns from Vertical_position_database_final_01.2026.txt
const EXPECTED_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'RANK', 'APHIA_ID', 'AUTHORITY',
  'ORIGINAL_NAME', 'LOCATION', 'LATITUDE', 'LONGITUDE', 'GEAR', 'PERIOD',
  'ZONE', 'STAGE', 'POSITION_ISLAND', 'FILTERED_VOLUME', 'BOTTOM_DEPTH',
  'DEPTH_INTERVAL_CONSIDERED', 'N_CAPTURE', 'MIN_DEPTH_CAPTURE',
  'MAX_DEPTH_CAPTURE', 'WEIGHTED_MEAN_DEPTH_CAPTURE',
  'WEIGHTED_SD_DEPTH_CAPTURE', 'WEIGHTING_DETAILS', 'EXT_REF',
  'REFERENCE', 'LINK',
];

describe('vertical position export columns', () => {
  it('should define VERTICAL_POSITION_EXPORT_COLUMNS matching original database', async () => {
    const mod = await import('../section-export.service');
    // Access the exported constant
    expect((mod as any).VERTICAL_POSITION_EXPORT_COLUMNS).toBeDefined();
    expect((mod as any).VERTICAL_POSITION_EXPORT_COLUMNS).toEqual(EXPECTED_COLUMNS);
  });

  it('should detect vertical position section traits', async () => {
    const mod = await import('../section-export.service');
    // The isVerticalPositionSection should detect VP traits
    expect((mod as any).isVerticalPositionSection(['vertical_distribution'])).toBe(true);
    expect((mod as any).isVerticalPositionSection(['vertical_day_depth'])).toBe(true);
    expect((mod as any).isVerticalPositionSection(['settlement_age'])).toBe(false);
    // Mixed VP + non-VP traits should NOT match VP section (falls through to generic)
    expect((mod as any).isVerticalPositionSection(['vertical_distribution', 'critical_swimming_speed'])).toBe(false);
  });
});
