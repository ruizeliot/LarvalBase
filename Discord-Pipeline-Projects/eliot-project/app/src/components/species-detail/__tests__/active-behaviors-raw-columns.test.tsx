/**
 * Tests for Active Behaviors raw data modal columns.
 * Each panel must show its database-specific columns from CSV raw data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  hasTraitSpecificColumns,
  getTraitColumns,
  VERTICAL_DISTRIBUTION_COLUMNS,
  CRITICAL_SWIMMING_ABS_COLUMNS,
  CRITICAL_SWIMMING_REL_COLUMNS,
  IN_SITU_SWIMMING_ABS_COLUMNS,
  IN_SITU_SWIMMING_REL_COLUMNS,
} from '../raw-data-modal';

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('Active Behaviors trait-specific column definitions', () => {
  it('should recognize all 5 Active Behaviors trait types', () => {
    expect(hasTraitSpecificColumns('vertical_distribution')).toBe(true);
    expect(hasTraitSpecificColumns('critical_swimming_speed')).toBe(true);
    expect(hasTraitSpecificColumns('critical_swimming_speed_rel')).toBe(true);
    expect(hasTraitSpecificColumns('in_situ_swimming_speed')).toBe(true);
    expect(hasTraitSpecificColumns('in_situ_swimming_speed_rel')).toBe(true);
  });

  it('should have trait-specific columns for ALL trait types (per columns_per_type.txt)', () => {
    expect(hasTraitSpecificColumns('settlement_age')).toBe(true);
    expect(hasTraitSpecificColumns('egg_diameter')).toBe(true);
  });

  // ==================== VERTICAL DISTRIBUTION ====================
  describe('Vertical Distribution columns', () => {
    const cols = VERTICAL_DISTRIBUTION_COLUMNS;
    const colKeys = cols.map(c => c.csvField);

    it('should have VALID_NAME as first column', () => {
      expect(cols[0].csvField).toBe('VALID_NAME');
      expect(cols[0].label).toBe('Name');
    });

    it.each([
      'LOCATION', 'LATITUDE', 'LONGITUDE', 'GEAR', 'PERIOD', 'ZONE',
      'STAGE', 'POSITION_ISLAND', 'FILTERED_VOLUME', 'BOTTOM_DEPTH',
      'DEPTH_INTERVAL_CONSIDERED', 'N_CAPTURE', 'MIN_DEPTH_CAPTURE',
      'MAX_DEPTH_CAPTURE', 'WEIGHTING_DETAILS',
    ])('should include %s column', (field) => {
      expect(colKeys).toContain(field);
    });

    it('should have EXT_REF column', () => {
      expect(colKeys).toContain('EXT_REF');
    });

    it('should have REFERENCE as last column with isReference=true', () => {
      const refCol = cols[cols.length - 1];
      expect(refCol.csvField).toBe('REFERENCE');
      expect(refCol.isReference).toBe(true);
      expect(refCol.linkField).toBe('LINK');
    });

    it('should have 18 columns total', () => {
      expect(cols.length).toBe(18);
    });
  });

  // ==================== CRITICAL SWIMMING SPEED (ABSOLUTE) ====================
  describe('Critical Swimming Speed (Absolute) columns', () => {
    const cols = CRITICAL_SWIMMING_ABS_COLUMNS;
    const colKeys = cols.map(c => c.csvField);

    it.each([
      'VALID_NAME', 'ORIGIN', 'LOCATION', 'N', 'AGE_RANGE_DPH', 'STAGE',
      'UCRIT_ABS_MEAN', 'UCRIT_ABS_MIN', 'UCRIT_ABS_MAX', 'UCRIT_ABS_CONF',
      'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
      'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
      'LENGTH_TYPE', 'LENGTH_MEAN',
      'UCRIT_ABS_MEAN_TYPE', 'UCRIT_ABS_RANGE_TYPE', 'UCRIT_ABS_CONF_TYPE',
      'REMARKS', 'EXT_REF', 'REFERENCE',
    ])('should include %s column', (field) => {
      expect(colKeys).toContain(field);
    });

    it('should have 24 columns total', () => {
      expect(cols.length).toBe(24);
    });
  });

  // ==================== CRITICAL SWIMMING SPEED (RELATIVE) ====================
  describe('Critical Swimming Speed (Relative) columns', () => {
    const cols = CRITICAL_SWIMMING_REL_COLUMNS;
    const colKeys = cols.map(c => c.csvField);

    it.each([
      'VALID_NAME', 'ORIGIN', 'LOCATION', 'N', 'AGE_RANGE_DPH', 'STAGE',
      'UCRIT_REL_MEAN', 'UCRIT_REL_MIN', 'UCRIT_REL_MAX', 'UCRIT_REL_CONF',
      'LENGTH_TYPE', 'LENGTH_MEAN', 'LENGTH_MIN', 'LENGTH_MAX', 'LENGTH_CONF', 'LENGTH_CONF_TYPE',
      'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
      'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
      'UCRIT_REL_CONF_TYPE',
      'REMARKS', 'EXT_REF', 'REFERENCE',
    ])('should include %s column', (field) => {
      expect(colKeys).toContain(field);
    });

    it('should have 26 columns total', () => {
      expect(cols.length).toBe(26);
    });
  });

  // ==================== IN SITU SWIMMING SPEED (ABSOLUTE) ====================
  describe('In Situ Swimming Speed (Absolute) columns', () => {
    const cols = IN_SITU_SWIMMING_ABS_COLUMNS;
    const colKeys = cols.map(c => c.csvField);

    it.each([
      'VALID_NAME', 'ORIGIN', 'LOCATION', 'N', 'AGE_RANGE_DPH', 'STAGE',
      'ISS_ABS_MEAN', 'ISS_ABS_MIN', 'ISS_ABS_MAX', 'ISS_ABS_CONF',
      'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
      'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
      'ISS_ABS_MEAN_TYPE', 'ISS_ABS_RANGE_TYPE', 'ISS_ABS_CONF_TYPE',
      'REMARKS', 'EXT_REF', 'REFERENCE',
    ])('should include %s column', (field) => {
      expect(colKeys).toContain(field);
    });

    it('should have 22 columns total', () => {
      expect(cols.length).toBe(22);
    });
  });

  // ==================== IN SITU SWIMMING SPEED (RELATIVE) ====================
  describe('In Situ Swimming Speed (Relative) columns', () => {
    const cols = IN_SITU_SWIMMING_REL_COLUMNS;
    const colKeys = cols.map(c => c.csvField);

    it.each([
      'VALID_NAME', 'ORIGIN', 'LOCATION', 'N', 'AGE_RANGE_DPH', 'STAGE',
      'ISS_REL_MEAN', 'ISS_REL_MIN', 'ISS_REL_MAX', 'ISS_REL_CONF',
      'LENGTH_TYPE', 'LENGTH_MEAN', 'LENGTH_MIN', 'LENGTH_MAX', 'LENGTH_CONF', 'LENGTH_CONF_TYPE',
      'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
      'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
      'ISS_REL_MEAN_TYPE', 'ISS_REL_RANGE_TYPE', 'ISS_REL_CONF_TYPE',
      'REMARKS', 'EXT_REF', 'REFERENCE',
    ])('should include %s column', (field) => {
      expect(colKeys).toContain(field);
    });

    it('should have 28 columns total', () => {
      expect(cols.length).toBe(28);
    });
  });
});

describe('Active Behaviors raw data modal rendering', () => {
  // Mock useRawData with vertical distribution data including rawFields
  beforeEach(() => {
    vi.resetModules();
  });

  it('should render vertical distribution columns from rawFields', async () => {
    vi.doMock('@/hooks/use-raw-data', () => ({
      useRawData: () => ({
        data: [
          {
            value: 28.77,
            unit: 'm',
            source: 'Kimmerling et al. (2018)',
            doi: 'https://doi.org/10.1038/s41559-017-0413-2',
            traitType: 'vertical_distribution',
            metadata: {
              rawFields: {
                VALID_NAME: 'Abalistes stellatus',
                LOCATION: 'Gulf of Aqaba',
                LATITUDE: '29.26 to 29.32',
                LONGITUDE: '34.54 to 34.59',
                GEAR: 'MOCNESS (1m2, mesh: 600um)',
                PERIOD: 'Day',
                ZONE: 'Nearshore (<5km from coast)',
                STAGE: null,
                POSITION_ISLAND: null,
                FILTERED_VOLUME: '150-494m3',
                BOTTOM_DEPTH: '150-400',
                DEPTH_INTERVAL_CONSIDERED: '0-25, 25-50, 50-75, 75-100',
                N_CAPTURE: 10,
                MIN_DEPTH_CAPTURE: 0,
                MAX_DEPTH_CAPTURE: 50,
                WEIGHTING_DETAILS: 'Weighted by standardized density (100m3)',
                EXT_REF: null,
                REFERENCE: 'Kimmerling et al. (2018) - Nat. Eco. Evol.',
                LINK: 'https://doi.org/10.1038/s41559-017-0413-2',
              },
            },
          },
        ],
        isLoading: false,
        error: null,
      }),
    }));

    const { RawDataModal } = await import('../raw-data-modal');

    renderWithProviders(
      <RawDataModal
        open={true}
        onOpenChange={vi.fn()}
        speciesId="abalistes-stellatus"
        speciesName="Abalistes stellatus"
        traitType="vertical_distribution"
        traitName="Vertical Distribution"
      />
    );

    // Check trait-specific column headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Latitude')).toBeInTheDocument();
    expect(screen.getByText('Longitude')).toBeInTheDocument();
    expect(screen.getByText('Gear')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Zone')).toBeInTheDocument();
    expect(screen.getByText('Bottom Depth')).toBeInTheDocument();
    expect(screen.getByText('N Capture')).toBeInTheDocument();
    expect(screen.getByText('Min Depth Capture')).toBeInTheDocument();
    expect(screen.getByText('Max Depth Capture')).toBeInTheDocument();
    expect(screen.getByText('Weighting Details')).toBeInTheDocument();
    expect(screen.getByText('Main Reference')).toBeInTheDocument();

    // Check data values are rendered
    expect(screen.getByText('Gulf of Aqaba')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should render critical swimming speed (absolute) columns from rawFields', async () => {
    vi.doMock('@/hooks/use-raw-data', () => ({
      useRawData: () => ({
        data: [
          {
            value: 5.7,
            unit: 'cm/s',
            source: 'Baptista et al (2019)',
            doi: 'https://doi.org/10.3390/d11100185',
            traitType: 'critical_swimming_speed',
            metadata: {
              rawFields: {
                VALID_NAME: 'Diplodus sargus',
                ORIGIN: 'Wild',
                LOCATION: 'Portuguese coast',
                N: 79,
                AGE_RANGE_DPH: '15-35',
                STAGE: 'Known settlement size range',
                TEMPERATURE_MEAN: 20.9,
                TEMPERATURE_MIN: null,
                TEMPERATURE_MAX: null,
                TEMPERATURE_CONF: 1.3,
                TEMPERATURE_MEAN_TYPE: 'mean',
                TEMPERATURE_CONF_TYPE: 'SD',
                LENGTH_TYPE: 'TL',
                LENGTH_MEAN: 11,
                UCRIT_ABS_MEAN_TYPE: 'mean',
                UCRIT_ABS_RANGE_TYPE: 'min-max',
                UCRIT_ABS_CONF_TYPE: 'SD',
                REMARKS: 'Inferred BL/s from mean TL',
                EXT_REF: null,
                REFERENCE: 'Baptista et al (2019) - MDPI',
                LINK: 'https://doi.org/10.3390/d11100185',
              },
            },
          },
        ],
        isLoading: false,
        error: null,
      }),
    }));

    const { RawDataModal } = await import('../raw-data-modal');

    renderWithProviders(
      <RawDataModal
        open={true}
        onOpenChange={vi.fn()}
        speciesId="diplodus-sargus"
        speciesName="Diplodus sargus"
        traitType="critical_swimming_speed"
        traitName="Critical Swimming Speed (Absolute)"
      />
    );

    // Check trait-specific column headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Origin')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('Stage')).toBeInTheDocument();
    expect(screen.getByText('Temp Mean')).toBeInTheDocument();
    expect(screen.getByText('Length Type')).toBeInTheDocument();
    expect(screen.getByText('Ucrit Abs Mean Type')).toBeInTheDocument();
    expect(screen.getByText('Remarks')).toBeInTheDocument();
    expect(screen.getByText('Main Reference')).toBeInTheDocument();

    // Check data values (some may appear more than once in dialog title/description)
    expect(screen.getAllByText('Diplodus sargus').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Wild')).toBeInTheDocument();
    expect(screen.getByText('Portuguese coast')).toBeInTheDocument();
    expect(screen.getByText('79')).toBeInTheDocument();
  });
});
