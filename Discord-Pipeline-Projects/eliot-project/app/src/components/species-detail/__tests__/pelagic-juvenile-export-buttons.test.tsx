/**
 * Test: Pelagic Juvenile section has Species/Genus/Family export buttons.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ rows: [] }),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// Mock the hooks
vi.mock('@/hooks/use-species-detail', () => ({
  useSpeciesDetail: () => ({
    data: {
      species: {
        scientificName: 'Test species',
        commonName: 'Test',
        family: 'Testidae',
        order: 'Testiformes',
      },
      traits: {},
    },
    isLoading: false,
    error: null,
    recordCount: 0,
    studyCount: 0,
    locations: [],
    references: [],
  }),
}));

vi.mock('@/hooks/use-raw-data', () => ({
  useRawData: () => ({ data: [] }),
}));

vi.mock('@/hooks/use-egg-qualitative', () => ({
  useEggQualitative: () => ({ data: null }),
}));

vi.mock('@/hooks/use-pelagic-juvenile', () => ({
  usePelagicJuvenile: () => ({
    data: {
      level: 'species',
      levelName: 'Test species',
      status: 'Known',
      keywords: [],
      genusSpecies: [],
      familySpecies: [],
      qualitativeRecords: [],
      sizeRecords: [],
      durationRecords: [],
      sizeStats: { mean: null, sd: null, min: null, max: null, n: 0 },
      durationStats: { mean: null, sd: null, min: null, max: null, n: 0 },
      comparisonStats: null,
    },
  }),
}));

vi.mock('@/hooks/use-rafting', () => ({
  useRafting: () => ({ data: null }),
}));

// Mock chart components that use D3/canvas
vi.mock('../species-growth-chart', () => ({
  SpeciesGrowthChart: () => null,
}));

vi.mock('../collection-map', () => ({
  CollectionMap: () => null,
}));

vi.mock('../family-bar-chart', () => ({
  FamilyBarChart: () => null,
}));

import { SpeciesDetail } from '../species-detail';

describe('Pelagic Juvenile export buttons', () => {
  it('should render Species/Genus/Family export buttons in Pelagic Juvenile section', () => {
    render(<SpeciesDetail speciesId="test-species" />);

    // The Pelagic Juvenile section should have export buttons
    // SectionExportButtons renders three buttons with text "Species", "Genus", "Family"
    const allButtons = screen.getAllByRole('button');
    const speciesButtons = allButtons.filter(b => b.textContent?.includes('Species'));
    const genusButtons = allButtons.filter(b => b.textContent?.includes('Genus'));
    const familyButtons = allButtons.filter(b => b.textContent?.includes('Family'));

    // There should be at least the Pelagic Juvenile export buttons
    expect(speciesButtons.length).toBeGreaterThanOrEqual(1);
    expect(genusButtons.length).toBeGreaterThanOrEqual(1);
    expect(familyButtons.length).toBeGreaterThanOrEqual(1);
  });
});
