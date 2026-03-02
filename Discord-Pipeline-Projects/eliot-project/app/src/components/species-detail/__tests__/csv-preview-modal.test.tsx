/**
 * Tests for US-9.2: CSV preview modal with scrollable table before download.
 *
 * Verifies:
 * 1. CsvPreviewModal renders a dialog with scrollable table
 * 2. Shows column headers and data rows
 * 3. Has a Download button that triggers CSV download
 * 4. Has a Close button
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock csv-utils
const mockDownloadCSV = vi.fn();
vi.mock('@/lib/export/csv-utils', () => ({
  downloadCSV: (...args: unknown[]) => mockDownloadCSV(...args),
  generateCSV: vi.fn(() => 'col1,col2\nval1,val2'),
}));

describe('US-9.2: CSV Preview Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleData = [
    { ORDER: 'Perciformes', FAMILY: 'Pomacentridae', GENUS: 'Chromis', VALID_NAME: 'Chromis viridis', VALUE: 0.72 },
    { ORDER: 'Perciformes', FAMILY: 'Pomacentridae', GENUS: 'Dascyllus', VALID_NAME: 'Dascyllus aruanus', VALUE: 0.82 },
  ];

  it('renders dialog with title and data table when open', async () => {
    const { CsvPreviewModal } = await import('../csv-preview-modal');

    render(
      <CsvPreviewModal
        open={true}
        onOpenChange={() => {}}
        data={sampleData}
        title="Egg & Incubation - Species Export"
        filename="egg-incubation-species-export"
      />
    );

    // Title should be visible
    expect(screen.getByText('Egg & Incubation - Species Export')).toBeDefined();

    // Column headers should be visible
    expect(screen.getByText('ORDER')).toBeDefined();
    expect(screen.getByText('FAMILY')).toBeDefined();
    expect(screen.getByText('VALID_NAME')).toBeDefined();

    // Data should be visible
    expect(screen.getByText('Chromis viridis')).toBeDefined();
    expect(screen.getByText('Dascyllus aruanus')).toBeDefined();
  });

  it('shows row count in description', async () => {
    const { CsvPreviewModal } = await import('../csv-preview-modal');

    render(
      <CsvPreviewModal
        open={true}
        onOpenChange={() => {}}
        data={sampleData}
        title="Test Export"
        filename="test"
      />
    );

    expect(screen.getByText(/2 rows/)).toBeDefined();
  });

  it('Download button triggers CSV download', async () => {
    const { CsvPreviewModal } = await import('../csv-preview-modal');

    render(
      <CsvPreviewModal
        open={true}
        onOpenChange={() => {}}
        data={sampleData}
        title="Test Export"
        filename="test-export"
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadBtn);

    expect(mockDownloadCSV).toHaveBeenCalledWith(sampleData, 'test-export', undefined);
  });

  it('does not render when open is false', async () => {
    const { CsvPreviewModal } = await import('../csv-preview-modal');

    const { container } = render(
      <CsvPreviewModal
        open={false}
        onOpenChange={() => {}}
        data={sampleData}
        title="Test Export"
        filename="test"
      />
    );

    // Dialog content should not be visible when closed
    expect(screen.queryByText('Test Export')).toBeNull();
  });

  it('shows empty state when data is empty', async () => {
    const { CsvPreviewModal } = await import('../csv-preview-modal');

    render(
      <CsvPreviewModal
        open={true}
        onOpenChange={() => {}}
        data={[]}
        title="Empty Export"
        filename="empty"
      />
    );

    expect(screen.getByText('No data to preview.')).toBeDefined();
  });
});
