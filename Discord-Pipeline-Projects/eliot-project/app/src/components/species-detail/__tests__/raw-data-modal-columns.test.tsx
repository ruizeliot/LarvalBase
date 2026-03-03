/**
 * Tests for US-3.3: Raw data modal shows _MIN, _MAX, _CONF columns alongside _MEAN.
 *
 * Must:
 * 1. Display Min, Max, and Conf columns in the table header
 * 2. Show min/max/conf values in each data row
 * 3. Show "-" when min/max/conf values are not available
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RawDataModal } from '../raw-data-modal';

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// Mock the useRawData hook to return data with min/max/conf
vi.mock('@/hooks/use-raw-data', () => ({
  useRawData: () => ({
    data: [
      {
        value: 0.72,
        unit: 'mm',
        source: 'Thresher 1984',
        doi: null,
        traitType: 'egg_diameter',
        metadata: {
          method: null,
          origin: null,
          temperatureMean: null,
          temperatureMin: null,
          temperatureMax: null,
          gear: null,
          location: 'Pacific',
          country: null,
          remarks: null,
          externalRef: null,
          lengthType: null,
          sampleSize: 12,
          minValue: 0.65,
          maxValue: 0.80,
          confValue: 0.02,
          confType: 'SD',
        },
      },
      {
        value: 0.74,
        unit: 'mm',
        source: 'Wellington 1989',
        doi: null,
        traitType: 'egg_diameter',
        metadata: {
          method: null,
          origin: null,
          temperatureMean: null,
          temperatureMin: null,
          temperatureMax: null,
          gear: null,
          location: null,
          country: null,
          remarks: null,
          externalRef: null,
          lengthType: null,
          sampleSize: null,
          minValue: null,
          maxValue: null,
          confValue: null,
          confType: null,
        },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('US-3.3: Raw data modal shows MIN/MAX/CONF columns', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    speciesId: 'chromis-viridis',
    speciesName: 'Chromis viridis',
    traitType: 'egg_diameter',
    traitName: 'Egg Length',
  };

  it('should display Min column header', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Min')).toBeInTheDocument();
  });

  it('should display Max column header', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('should display Conf column header', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Conf')).toBeInTheDocument();
  });

  it('should display Main reference column header', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Main reference')).toBeInTheDocument();
  });

  it('should display External reference column header', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('External reference')).toBeInTheDocument();
  });

  it('should show min/max values when available', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    // First row has min=0.65, max=0.80
    expect(screen.getByText('0.65')).toBeInTheDocument();
    expect(screen.getByText('0.80')).toBeInTheDocument();
  });

  it('should show conf value with type when available', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    // First row has conf=0.02, confType=SD
    expect(screen.getByText('0.02 (SD)')).toBeInTheDocument();
  });

  it('should show dash when min/max/conf are not available', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    // Second row has no min/max/conf - should show "-"
    const cells = screen.getAllByText('-');
    expect(cells.length).toBeGreaterThan(0);
  });
});
