/**
 * Test: Records tables (enlarged view) must show Mean, Min, Max, Conf, Conf_type columns.
 * These were missing from Hatching, Flexion, Metamorphosis, Settlement tables.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RawDataModal } from '../raw-data-modal';

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// Mock with rawFields present — this triggers the trait-specific table path
vi.mock('@/hooks/use-raw-data', () => ({
  useRawData: () => ({
    data: [
      {
        value: 3.2,
        unit: 'mm',
        source: 'Smith 2020',
        doi: null,
        traitType: 'hatching_size',
        metadata: {
          method: null,
          origin: null,
          temperatureMean: 25,
          temperatureMin: 24,
          temperatureMax: 26,
          gear: null,
          location: null,
          country: null,
          remarks: null,
          externalRef: 'REF001',
          lengthType: null,
          sampleSize: 10,
          minValue: 2.8,
          maxValue: 3.5,
          confValue: 0.15,
          confType: 'SD',
          rawFields: {
            VALID_NAME: 'Amphiprion ocellaris',
            HATCHING_SIZE_MEAN_TYPE: 'mean',
            HATCHING_SIZE_CONF_TYPE: 'SD',
            REARING_TEMPERATURE_MEAN: 25,
            REARING_TEMPERATURE_MIN: 24,
            REARING_TEMPERATURE_MAX: 26,
            REARING_TEMPERATURE_MEAN_TYPE: 'mean',
            EXT_REF: 'REF001',
            REFERENCE: 'Smith 2020',
            LINK: 'https://doi.org/10.1234',
          },
        },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('Records table measurement columns', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    speciesId: 'amphiprion-ocellaris',
    speciesName: 'Amphiprion ocellaris',
    traitType: 'hatching_size',
    traitName: 'Hatching Size',
  };

  it('should show Mean column header in trait-specific records table', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Mean')).toBeInTheDocument();
  });

  it('should show Min column header in trait-specific records table', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Min')).toBeInTheDocument();
  });

  it('should show Max column header in trait-specific records table', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('should show Conf column header in trait-specific records table', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    expect(screen.getByText('Conf')).toBeInTheDocument();
  });

  it('should show Conf Type column header in trait-specific records table', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    // Conf_type column — there may be multiple (trait-specific + standard)
    const confTypeHeaders = screen.getAllByText('Conf Type');
    expect(confTypeHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('should display measurement values', () => {
    renderWithProviders(<RawDataModal {...baseProps} />);
    // value=3.2, min=2.8, max=3.5, conf=0.15
    expect(screen.getByText('3.20')).toBeInTheDocument();
    expect(screen.getByText('2.80')).toBeInTheDocument();
    expect(screen.getByText('3.50')).toBeInTheDocument();
    expect(screen.getByText('0.15')).toBeInTheDocument();
  });
});
