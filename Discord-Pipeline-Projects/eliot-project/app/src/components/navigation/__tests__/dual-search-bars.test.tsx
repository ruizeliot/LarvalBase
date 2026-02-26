/**
 * Tests for US-2.7: Two search bars.
 *
 * Must have:
 * 1. Top search: "Search all species" — searches entire database
 * 2. Bottom search: "Search filtered species" — searches within filtered results
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '../app-sidebar';

// Mock hooks
vi.mock('@/hooks/use-species-data', () => ({
  useSpeciesData: () => ({
    species: [
      { id: 'sp-a', scientificName: 'Species A', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
    ],
    taxonomy: { name: 'Root', children: [], speciesCount: 1 },
    traitsBySpecies: new Map(),
    availableTraitTypes: new Set(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../taxonomy-tree', () => ({
  TaxonomyTree: () => <div data-testid="taxonomy-tree" />,
}));

vi.mock('../species-search', () => ({
  SpeciesSearch: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="species-search">{placeholder}</div>
  ),
}));

vi.mock('../species-count', () => ({
  SpeciesCount: () => <div data-testid="species-count" />,
}));

vi.mock('@/components/export/export-button', () => ({
  ExportButton: () => <div data-testid="export-button" />,
}));

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  SidebarContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  SidebarHeader: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  SidebarFooter: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  SidebarGroup: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarSeparator: () => <hr />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input placeholder={placeholder} data-testid="search-input" {...props} />
  ),
}));

describe('US-2.7: Two search bars', () => {
  it('should render a search bar for filtered species', () => {
    render(<AppSidebar />);

    // Should have an input with "Search filtered species" placeholder
    const inputs = screen.getAllByTestId('search-input');
    const filteredSearch = inputs.find(
      (el) => el.getAttribute('placeholder')?.includes('filtered')
    );
    expect(filteredSearch).toBeTruthy();
  });

  it('should render the all-species search at the top', () => {
    render(<AppSidebar />);

    // The SpeciesSearch component should be rendered (top search)
    expect(screen.getByTestId('species-search')).toBeInTheDocument();
  });
});
