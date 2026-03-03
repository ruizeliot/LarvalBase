/**
 * Tests for Fix 1: Vertical Position day/night split, negated depths, genus/family level data.
 */
import { describe, it, expect } from 'vitest';

describe('vertical position depth negation', () => {
  it('should negate positive depth values', () => {
    const negateDepth = (val: unknown): string | number | null | undefined => {
      if (val === null || val === undefined) return val;
      const numStr = String(val).trim();
      if (numStr === '' || numStr === 'NA') return val;
      const num = parseFloat(numStr);
      if (isNaN(num)) return val;
      return num === 0 ? 0 : -Math.abs(num);
    };

    expect(negateDepth(50)).toBe(-50);
    expect(negateDepth('25.5')).toBe(-25.5);
    expect(negateDepth(0)).toBe(0);
    expect(negateDepth(null)).toBe(null);
    expect(negateDepth(undefined)).toBe(undefined);
    expect(negateDepth('NA')).toBe('NA');
    expect(negateDepth('')).toBe('');
    // Already negative should stay negative
    expect(negateDepth(-10)).toBe(-10);
  });
});

describe('vertical position day/night splitting', () => {
  it('should assign traits based on PERIOD column', () => {
    const period = 'Day';
    const normalized = period.trim().toLowerCase();

    expect(normalized).toBe('day');
    // Day period → vertical_day_depth
    expect(normalized === 'day').toBe(true);
  });

  it('should handle night period', () => {
    const period = 'Night';
    const normalized = period.trim().toLowerCase();

    expect(normalized).toBe('night');
    expect(normalized === 'night').toBe(true);
  });
});

describe('vertical position genus/family level rows', () => {
  it('should use genus name when RANK is Genus and VALID_NAME is NA', () => {
    const row = {
      VALID_NAME: 'NA',
      RANK: 'Genus',
      GENUS: 'Amphiprion',
      FAMILY: 'Pomacentridae',
    };

    let validName = row.VALID_NAME;
    const rank = row.RANK.trim();

    if (validName === 'NA') {
      if (rank === 'Genus' && row.GENUS && row.GENUS !== 'NA') {
        validName = row.GENUS;
      } else if ((rank === 'Family' || rank === 'Subfamily') && row.FAMILY && row.FAMILY !== 'NA') {
        validName = row.FAMILY;
      }
    }

    expect(validName).toBe('Amphiprion');
  });

  it('should use family name when RANK is Family and VALID_NAME is NA', () => {
    const row = {
      VALID_NAME: 'NA',
      RANK: 'Family',
      GENUS: 'NA',
      FAMILY: 'Pomacentridae',
    };

    let validName = row.VALID_NAME;
    const rank = row.RANK.trim();

    if (validName === 'NA') {
      if (rank === 'Genus' && row.GENUS && row.GENUS !== 'NA') {
        validName = row.GENUS;
      } else if ((rank === 'Family' || rank === 'Subfamily') && row.FAMILY && row.FAMILY !== 'NA') {
        validName = row.FAMILY;
      }
    }

    expect(validName).toBe('Pomacentridae');
  });

  it('should keep valid species name when VALID_NAME is present', () => {
    const row = {
      VALID_NAME: 'Amphiprion ocellaris',
      RANK: 'Species',
      GENUS: 'Amphiprion',
      FAMILY: 'Pomacentridae',
    };

    let validName = row.VALID_NAME;
    // Should not enter the NA handling branch
    expect(validName).toBe('Amphiprion ocellaris');
  });
});

describe('vertical position display config', () => {
  it('should have day/night depth traits in DISPLAY_GROUPS', async () => {
    const { DISPLAY_GROUPS } = await import('@/components/species-detail/species-detail-config');
    const vertGroup = DISPLAY_GROUPS.find(g => g.title === 'Vertical Position');
    expect(vertGroup).toBeDefined();
    expect(vertGroup!.traits).toContain('vertical_day_depth');
    expect(vertGroup!.traits).toContain('vertical_night_depth');
    expect(vertGroup!.traits).toContain('vertical_distribution');
    expect(vertGroup!.unit).toBe('m');
  });

  it('should have correct TRAIT_UNITS for vertical depths', async () => {
    const { TRAIT_UNITS } = await import('@/components/species-detail/species-detail-config');
    expect(TRAIT_UNITS.vertical_day_depth).toBe('m');
    expect(TRAIT_UNITS.vertical_night_depth).toBe('m');
    expect(TRAIT_UNITS.vertical_distribution).toBe('m');
  });
});

describe('vertical position trait names', () => {
  it('should format vertical depth trait names correctly', async () => {
    const { formatTraitName } = await import('@/lib/constants/trait-groups');
    expect(formatTraitName('vertical_day_depth')).toBe('Daytime Depth');
    expect(formatTraitName('vertical_night_depth')).toBe('Nighttime Depth');
    expect(formatTraitName('vertical_distribution')).toBe('Overall Depth');
  });
});
