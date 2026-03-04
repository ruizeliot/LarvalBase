/**
 * Tests for Fix 1: Larval Growth sidebar sub-categories.
 * Should have "Age-at-length" and "Growth model" instead of "Point"/"Fitted model".
 */
import { describe, it, expect } from 'vitest';
import { TRAIT_GROUPS, formatTraitName } from '../trait-groups';

describe('Larval Growth sub-categories', () => {
  it('should have larval_age_at_length and growth_model in Larval Growth group', () => {
    const lg = TRAIT_GROUPS.find((g) => g.name === 'Larval Growth');
    expect(lg).toBeDefined();
    expect(lg?.traits).toContain('larval_age_at_length');
    expect(lg?.traits).toContain('growth_model');
  });

  it('should NOT have larval_length or larval_age in Larval Growth group', () => {
    const lg = TRAIT_GROUPS.find((g) => g.name === 'Larval Growth');
    expect(lg?.traits).not.toContain('larval_length');
    expect(lg?.traits).not.toContain('larval_age');
  });

  it('should format larval_age_at_length as "Age-at-length"', () => {
    expect(formatTraitName('larval_age_at_length')).toBe('Age-at-length');
  });

  it('should format growth_model as "Growth model"', () => {
    expect(formatTraitName('growth_model')).toBe('Growth model');
  });
});
