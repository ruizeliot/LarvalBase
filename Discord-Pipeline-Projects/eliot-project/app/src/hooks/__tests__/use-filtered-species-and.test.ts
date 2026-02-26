/**
 * Tests for US-2.5: Filter species by trait availability using AND logic.
 *
 * When multiple traits are selected, species must have ALL selected trait types.
 * Previous behavior was OR (any trait matches). Now must be AND (all traits match).
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredSpecies } from '../use-filtered-species';

const species = [
  { id: 'sp-a', scientificName: 'Species A', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
  { id: 'sp-b', scientificName: 'Species B', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
  { id: 'sp-c', scientificName: 'Species C', commonName: null, order: 'O2', family: 'F2', genus: 'G2' },
];

const traitsBySpecies = new Map([
  ['sp-a', [
    { traitType: 'egg_diameter', value: 1, unit: 'mm', source: null, doi: null },
    { traitType: 'settlement_age', value: 30, unit: 'days', source: null, doi: null },
  ]],
  ['sp-b', [
    { traitType: 'egg_diameter', value: 2, unit: 'mm', source: null, doi: null },
  ]],
  ['sp-c', [
    { traitType: 'settlement_age', value: 25, unit: 'days', source: null, doi: null },
  ]],
]);

describe('US-2.5: AND logic trait filtering', () => {
  it('should return all species when no traits selected', () => {
    const { result } = renderHook(() =>
      useFilteredSpecies({
        species,
        searchTerm: '',
        selectedTraits: new Set(),
        traitsBySpecies,
      })
    );
    expect(result.current).toHaveLength(3);
  });

  it('should filter with single trait (trivially AND)', () => {
    const { result } = renderHook(() =>
      useFilteredSpecies({
        species,
        searchTerm: '',
        selectedTraits: new Set(['egg_diameter']),
        traitsBySpecies,
      })
    );
    // Only sp-a and sp-b have egg_diameter
    expect(result.current).toHaveLength(2);
    expect(result.current.map(s => s.id)).toEqual(['sp-a', 'sp-b']);
  });

  it('should require ALL selected traits (AND logic)', () => {
    const { result } = renderHook(() =>
      useFilteredSpecies({
        species,
        searchTerm: '',
        selectedTraits: new Set(['egg_diameter', 'settlement_age']),
        traitsBySpecies,
      })
    );
    // Only sp-a has BOTH egg_diameter AND settlement_age
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('sp-a');
  });

  it('should return empty when no species matches all traits', () => {
    const { result } = renderHook(() =>
      useFilteredSpecies({
        species,
        searchTerm: '',
        selectedTraits: new Set(['egg_diameter', 'settlement_age', 'rafting_behavior']),
        traitsBySpecies,
      })
    );
    // No species has all three
    expect(result.current).toHaveLength(0);
  });
});
