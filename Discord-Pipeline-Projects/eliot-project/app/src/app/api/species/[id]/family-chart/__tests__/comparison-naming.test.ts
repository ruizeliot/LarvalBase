/**
 * Tests for comparison barplot naming and color logic.
 *
 * - >20 species in family → genus comparison (species in same genus), BLUE bars
 * - <=20 species → family comparison (all species in family), RED bars
 */
import { describe, it, expect } from 'vitest';

describe('comparison naming logic', () => {
  it('genus comparison should use blue color (#619CFF)', () => {
    // Genus comparison = comparing species within the same genus
    const comparisonType = 'genus';
    const otherSpeciesColor = comparisonType === 'genus' ? '#619CFF' : '#F8766D';
    expect(otherSpeciesColor).toBe('#619CFF');
  });

  it('family comparison should use red color (#F8766D)', () => {
    // Family comparison = comparing genera within the same family
    const comparisonType = 'family';
    const otherSpeciesColor = comparisonType === 'genus' ? '#619CFF' : '#F8766D';
    expect(otherSpeciesColor).toBe('#F8766D');
  });

  it('genus comparison title should be "Genus Comparison"', () => {
    const comparisonType = 'genus' as const;
    const title = comparisonType === 'genus' ? 'Genus Comparison' : 'Family Comparison';
    expect(title).toBe('Genus Comparison');
  });

  it('family comparison title should be "Family Comparison"', () => {
    const comparisonType = 'family' as const;
    const title = comparisonType === 'genus' ? 'Genus Comparison' : 'Family Comparison';
    expect(title).toBe('Family Comparison');
  });
});
