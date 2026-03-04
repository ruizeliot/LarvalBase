/**
 * Tests for genus/family level data inclusion in barplot comparisons.
 *
 * RANK == "Genus" rows should appear as "GENUS sp." (e.g., "Thunnus sp.")
 * RANK == "Family"/"Subfamily" rows should appear as "FAMILY und." (e.g., "Scombridae und.")
 */
import { describe, it, expect } from 'vitest';

/**
 * Helper: replicate the labeling logic for genus/family rows.
 */
function buildSyntheticLabel(rank: string, genus: string, family: string): string | null {
  if (rank === 'Genus' && genus && genus !== 'NA') {
    return `${genus} sp.`;
  }
  if ((rank === 'Family' || rank === 'Subfamily') && family && family !== 'NA') {
    return `${family} und.`;
  }
  return null;
}

describe('genus/family level labeling', () => {
  it('should label genus-level rows as "GENUS sp."', () => {
    expect(buildSyntheticLabel('Genus', 'Thunnus', 'Scombridae')).toBe('Thunnus sp.');
    expect(buildSyntheticLabel('Genus', 'Abudefduf', 'Pomacentridae')).toBe('Abudefduf sp.');
  });

  it('should label family-level rows as "FAMILY und."', () => {
    expect(buildSyntheticLabel('Family', 'NA', 'Scombridae')).toBe('Scombridae und.');
    expect(buildSyntheticLabel('Subfamily', 'NA', 'Pomacentridae')).toBe('Pomacentridae und.');
  });

  it('should return null for species-level rows', () => {
    expect(buildSyntheticLabel('Species', 'Thunnus', 'Scombridae')).toBe(null);
  });

  it('should return null for genus rows with NA genus', () => {
    expect(buildSyntheticLabel('Genus', 'NA', 'Scombridae')).toBe(null);
  });
});

describe('genus/family rows create synthetic species entries', () => {
  it('should slugify "Thunnus sp." correctly', () => {
    const name = 'Thunnus sp.';
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    expect(slug).toBe('thunnus-sp');
  });

  it('should slugify "Scombridae und." correctly', () => {
    const name = 'Scombridae und.';
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    expect(slug).toBe('scombridae-und');
  });
});
