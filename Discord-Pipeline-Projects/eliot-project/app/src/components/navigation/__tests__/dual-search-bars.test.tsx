/**
 * Tests for sidebar search: single search bar at top.
 *
 * BUG 23 fix: removed the second "filtered species" search bar.
 * Only one search bar remains (SpeciesSearch at top).
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

describe('Sidebar search bar', () => {
  it('should render the species search at the top', () => {
    render(<AppSidebar />);

    // The SpeciesSearch component should be rendered (single search)
    expect(screen.getByTestId('species-search')).toBeInTheDocument();
  });

  it('should NOT render a second filtered search bar', () => {
    render(<AppSidebar />);

    // Only one search component should exist — no "search-input" from the old Input mock
    const inputs = screen.queryAllByTestId('search-input');
    expect(inputs).toHaveLength(0);
  });
});
