/**
 * Tests for homepage mandala image placement and caption.
 *
 * The mandala image must appear above the publication chart with a
 * descriptive caption containing italicized scientific names.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../page';

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
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/navigation/app-sidebar', () => ({
  AppSidebar: () => <div />,
}));

vi.mock('@/components/species-detail/species-detail', () => ({
  SpeciesDetail: () => <div />,
}));

describe('Homepage mandala image', () => {
  it('should display the mandala image', () => {
    render(<Home />);
    const img = screen.getByAltText(/mandala/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/mandala.png');
  });

  it('should not display the mandala caption (removed per QA)', () => {
    render(<Home />);
    // Caption was removed — species names should not appear
    expect(screen.queryByText(/Bryx dunckeri/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Canthidermis maculata/)).not.toBeInTheDocument();
  });

  it('should display the new research description text', () => {
    render(<Home />);
    expect(screen.getByText(/comprehensive database of 35 traits/)).toBeInTheDocument();
  });

  it('should display editor and developer subtitle', () => {
    render(<Home />);
    expect(screen.getByText(/Editor & Manager: Eliot Ruiz/)).toBeInTheDocument();
    expect(screen.getByText(/Developer: Anthony Hunt/)).toBeInTheDocument();
  });
});
