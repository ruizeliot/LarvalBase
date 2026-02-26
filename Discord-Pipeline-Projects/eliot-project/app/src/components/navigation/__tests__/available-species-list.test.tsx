/**
 * Tests for US-2.6: Live-updating "Available species" list.
 *
 * Must:
 * 1. Rename "Taxonomy" sidebar group to "Available Species"
 * 2. The list updates live when filters change (already works via hook)
 * 3. Show count of displayed species
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '../app-sidebar';

// Mock hooks
vi.mock('@/hooks/use-species-data', () => ({
  useSpeciesData: () => ({
    species: [
      { id: 'sp-a', scientificName: 'Species A', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
      { id: 'sp-b', scientificName: 'Species B', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
    ],
    taxonomy: { name: 'Root', children: [], speciesCount: 2 },
    traitsBySpecies: new Map(),
    availableTraitTypes: new Set(),
    isLoading: false,
    error: null,
  }),
}));

// Mock child components that are hard to render
vi.mock('../taxonomy-tree', () => ({
  TaxonomyTree: () => <div data-testid="taxonomy-tree" />,
}));

vi.mock('../species-search', () => ({
  SpeciesSearch: () => <div data-testid="species-search" />,
}));

vi.mock('../species-count', () => ({
  SpeciesCount: ({ total, filtered }: { total: number; filtered: number }) => (
    <div data-testid="species-count">{filtered} / {total}</div>
  ),
}));

vi.mock('@/components/export/export-button', () => ({
  ExportButton: () => <div data-testid="export-button" />,
}));

// Mock the UI components
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

describe('US-2.6: Live-updating Available Species list', () => {
  it('should display "Available Species" instead of "Taxonomy"', () => {
    render(<AppSidebar />);

    expect(screen.getByText('Available Species')).toBeInTheDocument();
    expect(screen.queryByText('Taxonomy')).not.toBeInTheDocument();
  });

  it('should show the species count', () => {
    render(<AppSidebar />);

    expect(screen.getByTestId('species-count')).toBeInTheDocument();
  });
});
