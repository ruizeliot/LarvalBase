/**
 * Tests for US-2.1: New LarvalBase title reflecting 2026 publication.
 *
 * The homepage must display the full title:
 * "LarvalBase: Global pelagic dispersal traits databases for early-life stages of marine fishes – Ruiz et al. (2026)"
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../page';

// Mock the hooks and child components to isolate the homepage
vi.mock('@/hooks/use-species-data', () => ({
  useSpeciesData: () => ({
    species: [],
    taxonomy: null,
    traitsBySpecies: new Map(),
    availableTraitTypes: new Set(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('@/components/navigation/app-sidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar" />,
}));

vi.mock('@/components/species-detail/species-detail', () => ({
  SpeciesDetail: () => <div data-testid="species-detail" />,
}));

describe('US-2.1: New LarvalBase Title', () => {
  it('should display the full 2026 publication title', () => {
    render(<Home />);

    // "LarvalBase" appears in title and body text, so use getAllByText
    expect(screen.getAllByText(/LarvalBase/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Global pelagic dispersal traits databases for early-life stages of marine fishes/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ruiz et al\. \(2026\)/)).toBeInTheDocument();
  });

  it('should not display the old generic title', () => {
    render(<Home />);

    // The old title was just "LarvalBase" with subtitle "Fish Larvae Trait Database"
    expect(screen.queryByText('Fish Larvae Trait Database')).not.toBeInTheDocument();
  });
});
