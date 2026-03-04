/**
 * Tests for Fix 4: Remove genus/family level species pages.
 * Species like "Acanthocybium sp." or "Pomacentridae und." should NOT have species pages.
 * They should still appear in barplots and exports.
 */
import { describe, it, expect } from 'vitest';
import { isGenusOrFamilyLevelId } from '../species.service';

describe('genus/family level ID detection', () => {
  it('should detect genus-level IDs (ending in "sp.")', () => {
    expect(isGenusOrFamilyLevelId('Acanthocybium sp.')).toBe(true);
    expect(isGenusOrFamilyLevelId('Gobiidae sp.')).toBe(true);
  });

  it('should detect family-level IDs (ending in "und.")', () => {
    expect(isGenusOrFamilyLevelId('Pomacentridae und.')).toBe(true);
    expect(isGenusOrFamilyLevelId('Labridae und.')).toBe(true);
  });

  it('should NOT flag real species names', () => {
    expect(isGenusOrFamilyLevelId('Acanthurus triostegus')).toBe(false);
    expect(isGenusOrFamilyLevelId('Dascyllus aruanus')).toBe(false);
  });

  it('should detect IDs with "spp." suffix', () => {
    expect(isGenusOrFamilyLevelId('Gobiidae spp.')).toBe(true);
  });
});
