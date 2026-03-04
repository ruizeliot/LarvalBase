/**
 * Tests for Fix 3: Remove Day/Night from Vertical Position sidebar filter.
 */
import { describe, it, expect } from 'vitest';
import { TRAIT_GROUPS } from '../trait-groups';

describe('Vertical Position sidebar — no Day/Night', () => {
  it('should NOT have vertical_day or vertical_night in Vertical Position group', () => {
    const vp = TRAIT_GROUPS.find((g) => g.name === 'Vertical Position');
    expect(vp).toBeDefined();
    expect(vp?.traits).not.toContain('vertical_day');
    expect(vp?.traits).not.toContain('vertical_night');
  });

  it('should still have depth traits in Vertical Position', () => {
    const vp = TRAIT_GROUPS.find((g) => g.name === 'Vertical Position');
    expect(vp?.traits).toContain('vertical_distribution');
    expect(vp?.traits).toContain('vertical_day_depth');
    expect(vp?.traits).toContain('vertical_night_depth');
  });
});
