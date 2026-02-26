/**
 * Tests for US-2.8: Export filtered species list.
 *
 * Must:
 * 1. Have an "Export Species List" button in the sidebar footer
 * 2. Button should be present and accessible
 * 3. Export uses the filtered (and searched) species data
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

vi.mock('../taxonomy-tree', () => ({
  TaxonomyTree: () => <div data-testid="taxonomy-tree" />,
}));

vi.mock('../species-search', () => ({
  SpeciesSearch: () => <div data-testid="species-search" />,
}));

vi.mock('../species-count', () => ({
  SpeciesCount: () => <div data-testid="species-count" />,
}));

let capturedExportData: unknown[] = [];
vi.mock('@/components/export/export-button', () => ({
  ExportButton: ({ data, label }: { data: unknown[]; label: string }) => {
    capturedExportData = data;
    return <button data-testid="export-button">{label}</button>;
  },
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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input data-testid="search-input" {...props} />,
}));

describe('US-2.8: Export filtered species list', () => {
  it('should render an Export Species List button', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('export-button')).toBeInTheDocument();
    expect(screen.getByText('Export Species List')).toBeInTheDocument();
  });

  it('should pass species data to the export button', () => {
    render(<AppSidebar />);
    // The export data should contain the species mapped from the hook
    expect(capturedExportData).toHaveLength(2);
    expect(capturedExportData[0]).toHaveProperty('Scientific_Name');
    expect(capturedExportData[0]).toHaveProperty('Family');
    expect(capturedExportData[0]).toHaveProperty('Order');
  });
});
