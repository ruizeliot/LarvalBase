/**
 * Test: Rafting section has Species/Genus/Family export buttons.
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
  usePelagicJuvenile: () => ({ data: null }),
}));

vi.mock('@/hooks/use-rafting', () => ({
  useRafting: () => ({
    data: {
      level: 'species',
      levelName: 'Test species',
      status: 'Known',
      flotsamValues: [],
      stageValues: [],
      genusSpecies: [],
      familySpecies: [],
      qualitativeRecords: [],
      sizeRecords: [],
      ageRecords: [],
      sizeStats: { mean: null, sd: null, min: null, max: null, n: 0 },
      ageStats: { mean: null, sd: null, min: null, max: null, n: 0 },
      comparisonStats: null,
    },
  }),
}));

// Mock chart components
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

describe('Rafting export buttons', () => {
  it('should render Species/Genus/Family export buttons in Rafting section', () => {
    render(<SpeciesDetail speciesId="test-species" />);

    // Find the Rafting heading (h2 specifically)
    const headings = screen.getAllByRole('heading', { level: 2 });
    const raftingHeading = headings.find(h => h.textContent === 'Rafting');
    expect(raftingHeading).toBeDefined();

    // The Rafting section parent should contain export buttons
    const raftingSection = raftingHeading!.closest('.space-y-4');
    expect(raftingSection).not.toBeNull();

    // Check that export buttons exist within the section
    const buttons = raftingSection!.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map(b => b.textContent);
    expect(buttonTexts.some(t => t?.includes('Species'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Genus'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Family'))).toBe(true);
  });
});
