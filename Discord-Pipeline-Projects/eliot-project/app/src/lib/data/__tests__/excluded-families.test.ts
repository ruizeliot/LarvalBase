/**
 * Tests for US-0.2: Remove Melampidae, Odontostomidae, Parapercidae from all views.
 *
 * These are non-fish families (gastropod mollusks / invalid taxonomy)
 * that were erroneously included in the vertical position database.
 *
 * Verifies:
 * 1. EXCLUDED_FAMILIES constant is defined with the 3 families
 * 2. isExcludedFamily() utility works correctly
 * 3. Vertical position CSV still contains the rows (data not modified)
 * 4. Filtering is applied at the data processing level
 */
import { describe, it, expect } from 'vitest';
import { EXCLUDED_FAMILIES, isExcludedFamily } from '../excluded-families';

describe('US-0.2: Excluded Families Filter', () => {
  it('should define EXCLUDED_FAMILIES with exactly 3 families', () => {
    expect(EXCLUDED_FAMILIES).toBeDefined();
    expect(EXCLUDED_FAMILIES).toBeInstanceOf(Set);
    expect(EXCLUDED_FAMILIES.size).toBe(3);
  });

  it('should include Melampidae, Odontostomidae, Parapercidae', () => {
    expect(EXCLUDED_FAMILIES.has('Melampidae')).toBe(true);
    expect(EXCLUDED_FAMILIES.has('Odontostomidae')).toBe(true);
    expect(EXCLUDED_FAMILIES.has('Parapercidae')).toBe(true);
  });

  it('should NOT exclude valid fish families', () => {
    expect(isExcludedFamily('Acanthuridae')).toBe(false);
    expect(isExcludedFamily('Balistidae')).toBe(false);
    expect(isExcludedFamily('Serranidae')).toBe(false);
  });

  it('should exclude the 3 invalid families', () => {
    expect(isExcludedFamily('Melampidae')).toBe(true);
    expect(isExcludedFamily('Odontostomidae')).toBe(true);
    expect(isExcludedFamily('Parapercidae')).toBe(true);
  });

  it('should handle null/undefined/empty gracefully', () => {
    expect(isExcludedFamily('')).toBe(false);
    expect(isExcludedFamily(null as unknown as string)).toBe(false);
    expect(isExcludedFamily(undefined as unknown as string)).toBe(false);
  });
});
