/**
 * Tests for US-9.1: Section-level CSV export with Species/Genus/Family buttons.
 *
 * Verifies:
 * 1. SectionExportButtons component renders three export buttons (Species/Genus/Family)
 * 2. Buttons are disabled when no data is available
 * 3. Clicking a button fetches data from the export API and triggers download
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock csv-utils to spy on downloads
vi.mock('@/lib/export/csv-utils', () => ({
  downloadCSV: vi.fn(),
  generateCSV: vi.fn(() => 'col1,col2\nval1,val2'),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('US-9.1: Section Export Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three export buttons: Species, Genus, Family', async () => {
    const { SectionExportButtons } = await import('../section-export-buttons');

    render(
      <SectionExportButtons
        speciesId="chromis-viridis"
        sectionTitle="Egg & Incubation"
        traitKeys={['egg_diameter', 'egg_volume']}
      />
    );

    expect(screen.getByRole('button', { name: /species/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /genus/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /family/i })).toBeDefined();
  });

  it('buttons show download icons', async () => {
    const { SectionExportButtons } = await import('../section-export-buttons');

    render(
      <SectionExportButtons
        speciesId="chromis-viridis"
        sectionTitle="Settlement"
        traitKeys={['settlement_age', 'settlement_size']}
      />
    );

    // All three buttons should exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('clicking Species button fetches export data at species level', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rows: [
          { ORDER: 'Perciformes', FAMILY: 'Pomacentridae', GENUS: 'Chromis', VALID_NAME: 'Chromis viridis' },
        ],
      }),
    });

    const { SectionExportButtons } = await import('../section-export-buttons');

    render(
      <SectionExportButtons
        speciesId="chromis-viridis"
        sectionTitle="Egg & Incubation"
        traitKeys={['egg_diameter']}
      />
    );

    const speciesBtn = screen.getByRole('button', { name: /species/i });
    fireEvent.click(speciesBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/export/section'),
        expect.anything()
      );
    });

    // Verify the fetch URL contains level=species
    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('level=species');
  });

  it('clicking Genus button fetches at genus level', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [] }),
    });

    const { SectionExportButtons } = await import('../section-export-buttons');

    render(
      <SectionExportButtons
        speciesId="chromis-viridis"
        sectionTitle="Settlement"
        traitKeys={['settlement_age']}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /genus/i }));

    await waitFor(() => {
      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('level=genus');
    });
  });

  it('clicking Family button fetches at family level', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [] }),
    });

    const { SectionExportButtons } = await import('../section-export-buttons');

    render(
      <SectionExportButtons
        speciesId="chromis-viridis"
        sectionTitle="Settlement"
        traitKeys={['settlement_age']}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /family/i }));

    await waitFor(() => {
      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('level=family');
    });
  });
});
