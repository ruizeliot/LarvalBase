/**
 * Tests for BUG 4: Taxonomy tree must filter when traits are selected.
 *
 * When trait filters are active, the Available Species tree must show ONLY
 * families/genera/species that have data for ALL active traits.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from '../app-sidebar';

let capturedTreeData: unknown = null;

vi.mock('@/hooks/use-species-data', () => ({
  useSpeciesData: () => ({
    species: [
      { id: 'sp-a', scientificName: 'Species A', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
      { id: 'sp-b', scientificName: 'Species B', commonName: null, order: 'O1', family: 'F1', genus: 'G1' },
      { id: 'sp-c', scientificName: 'Species C', commonName: null, order: 'O2', family: 'F2', genus: 'G2' },
    ],
    taxonomy: {
      name: 'All Species',
      level: 'root',
      children: [
        {
          name: 'O1', level: 'order', speciesCount: 2, children: [
            {
              name: 'F1', level: 'family', speciesCount: 2, children: [
                {
                  name: 'G1', level: 'genus', speciesCount: 2, children: [
                    { name: 'Species A', level: 'species', speciesCount: 1, children: [] },
                    { name: 'Species B', level: 'species', speciesCount: 1, children: [] },
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'O2', level: 'order', speciesCount: 1, children: [
            {
              name: 'F2', level: 'family', speciesCount: 1, children: [
                {
                  name: 'G2', level: 'genus', speciesCount: 1, children: [
                    { name: 'Species C', level: 'species', speciesCount: 1, children: [] },
                  ]
                }
              ]
            }
          ]
        },
      ],
      speciesCount: 3,
    },
    traitsBySpecies: new Map([
      ['sp-a', [
        { traitType: 'egg_diameter', value: 1, unit: 'mm', source: null, doi: null },
      ]],
      ['sp-b', [
        { traitType: 'egg_diameter', value: 2, unit: 'mm', source: null, doi: null },
      ]],
      // sp-c has NO traits
    ]),
    availableTraitTypes: new Set(['egg_diameter']),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../taxonomy-tree', () => ({
  TaxonomyTree: ({ data }: { data: unknown }) => {
    capturedTreeData = data;
    return <div data-testid="taxonomy-tree" />;
  },
}));

vi.mock('../species-search', () => ({
  SpeciesSearch: () => <div data-testid="species-search" />,
}));

vi.mock('../species-count', () => ({
  SpeciesCount: ({ filtered }: { filtered: number }) => (
    <div data-testid="species-count">{filtered}</div>
  ),
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

// Mock TraitFilters to expose a clickable checkbox
vi.mock('../trait-filters', () => ({
  TraitFilters: ({ onTraitToggle }: { onTraitToggle: (t: string) => void }) => (
    <div data-testid="trait-filters">
      <button data-testid="toggle-egg" onClick={() => onTraitToggle('egg_diameter')}>
        Toggle egg
      </button>
    </div>
  ),
}));

describe('BUG 4: Taxonomy tree filters with trait selection', () => {
  beforeEach(() => {
    capturedTreeData = null;
  });

  it('should pass full taxonomy when no filters active', () => {
    render(<AppSidebar />);
    // Tree should get the full taxonomy (3 species, 2 orders)
    const data = capturedTreeData as { speciesCount: number; children: unknown[] };
    expect(data).not.toBeNull();
    expect(data.speciesCount).toBe(3);
    expect(data.children).toHaveLength(2);
  });

  it('should pass filtered taxonomy when trait filter is active', () => {
    render(<AppSidebar />);

    // Click the egg_diameter trait toggle
    fireEvent.click(screen.getByTestId('toggle-egg'));

    // Now the tree should only show species with egg_diameter (sp-a, sp-b in O1/F1/G1)
    const data = capturedTreeData as { speciesCount: number; children: { name: string }[] };
    expect(data.speciesCount).toBe(2);
    expect(data.children).toHaveLength(1); // Only O1 should remain
    expect(data.children[0].name).toBe('O1');
  });
});
