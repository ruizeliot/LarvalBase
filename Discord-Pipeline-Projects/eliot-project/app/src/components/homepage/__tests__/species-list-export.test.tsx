/**
 * Tests for US-9.3: Global species list export from homepage.
 *
 * Verifies:
 * 1. SpeciesListExport component renders an export button
 * 2. Clicking the button fetches species data and triggers CSV download
 * 3. Exported CSV includes taxonomy columns (ORDER, FAMILY, GENUS, VALID_NAME)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock csv-utils
const mockDownloadCSV = vi.fn();
vi.mock('@/lib/export/csv-utils', () => ({
  downloadCSV: (...args: unknown[]) => mockDownloadCSV(...args),
  generateCSV: vi.fn(() => ''),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('US-9.3: Species List Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Export Species List button', async () => {
    const { SpeciesListExport } = await import('../species-list-export');

    render(<SpeciesListExport />);

    expect(screen.getByRole('button', { name: /export species list/i })).toBeDefined();
  });

  it('fetches species data and downloads CSV on click', async () => {
    const mockSpecies = [
      { id: 'chromis-viridis', validName: 'Chromis viridis', commonName: null, order: 'Perciformes', family: 'Pomacentridae', genus: 'Chromis' },
      { id: 'dascyllus-aruanus', validName: 'Dascyllus aruanus', commonName: 'Humbug dascyllus', order: 'Perciformes', family: 'Pomacentridae', genus: 'Dascyllus' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ species: mockSpecies, count: 2 }),
    });

    const { SpeciesListExport } = await import('../species-list-export');

    render(<SpeciesListExport />);

    fireEvent.click(screen.getByRole('button', { name: /export species list/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/species', expect.anything());
    });

    await waitFor(() => {
      expect(mockDownloadCSV).toHaveBeenCalled();
      const exportedData = mockDownloadCSV.mock.calls[0][0];
      // Should include taxonomy columns
      expect(exportedData[0]).toHaveProperty('ORDER');
      expect(exportedData[0]).toHaveProperty('FAMILY');
      expect(exportedData[0]).toHaveProperty('GENUS');
      expect(exportedData[0]).toHaveProperty('VALID_NAME');
    });
  });

  it('shows loading state while fetching', async () => {
    // Create a promise that won't resolve immediately
    let resolvePromise: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(fetchPromise);

    const { SpeciesListExport } = await import('../species-list-export');

    render(<SpeciesListExport />);

    fireEvent.click(screen.getByRole('button', { name: /export species list/i }));

    // Button should be disabled while loading
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /export/i });
      expect(btn.hasAttribute('disabled') || btn.getAttribute('disabled') !== null).toBeTruthy();
    });

    // Resolve to clean up
    resolvePromise!({
      ok: true,
      json: async () => ({ species: [], count: 0 }),
    });
  });
});
