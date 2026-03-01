/**
 * Tests for Epic 6: Pelagic Juvenile section.
 *
 * US-6.1: Qualitative panel showing known/unknown status, keywords,
 * and related species in genus/family.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PelagicJuvenilePanel,
  type PelagicJuvenileData,
} from '../pelagic-juvenile-panel';

// --- US-6.1 test data ---

const knownSpeciesData: PelagicJuvenileData = {
  level: 'species',
  levelName: 'Chromis viridis',
  status: 'Known',
  keywords: ['acronurus', 'post-larva'],
  genusSpecies: ['Chromis atripectoralis', 'Chromis margaritifer'],
  familySpecies: ['Dascyllus aruanus', 'Pomacentrus pavo'],
  sizeRecords: [],
  durationRecords: [],
  comparisonStats: null,
};

const unknownSpeciesData: PelagicJuvenileData = {
  level: 'species',
  levelName: 'Gobius niger',
  status: 'Unknown',
  keywords: [],
  genusSpecies: [],
  familySpecies: ['Gobius paganellus'],
  sizeRecords: [],
  durationRecords: [],
  comparisonStats: null,
};

const noDataResult: PelagicJuvenileData = {
  level: 'family',
  levelName: 'Scorpaenidae',
  status: 'Unknown',
  keywords: [],
  genusSpecies: [],
  familySpecies: [],
  sizeRecords: [],
  durationRecords: [],
  comparisonStats: null,
};

describe('US-6.1: Pelagic juvenile qualitative panel', () => {
  it('should render the qualitative panel with data-testid', () => {
    const { container } = render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(
      container.querySelector('[data-testid="pelagic-juvenile-panel"]')
    ).toBeInTheDocument();
  });

  it('should display "Known" status when species exists in database', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText('Known')).toBeInTheDocument();
  });

  it('should display "Unknown" status when species has no pelagic juvenile data', () => {
    render(<PelagicJuvenilePanel data={unknownSpeciesData} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('should show keyword values comma-separated', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText('acronurus, post-larva')).toBeInTheDocument();
  });

  it('should show "None" when no keywords exist', () => {
    render(<PelagicJuvenilePanel data={unknownSpeciesData} />);
    // Find the keywords row and check for "None"
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('should list known pelagic juveniles in genus in italic', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText(/Chromis atripectoralis/)).toBeInTheDocument();
    expect(screen.getByText(/Chromis margaritifer/)).toBeInTheDocument();
  });

  it('should list known pelagic juveniles in family (excluding same genus)', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText(/Dascyllus aruanus/)).toBeInTheDocument();
    expect(screen.getByText(/Pomacentrus pavo/)).toBeInTheDocument();
  });

  it('should show "None known" when no genus species exist', () => {
    render(<PelagicJuvenilePanel data={unknownSpeciesData} />);
    const noneKnownElements = screen.getAllByText('None known');
    expect(noneKnownElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show section label "Pelagic juvenile"', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText('Pelagic juvenile')).toBeInTheDocument();
  });

  it('should show "Name given" label', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText('Name given')).toBeInTheDocument();
  });
});

// --- US-6.2 test data ---

const dataWithSize: PelagicJuvenileData = {
  level: 'species',
  levelName: 'Chromis viridis',
  status: 'Known',
  keywords: ['post-larva'],
  genusSpecies: [],
  familySpecies: [],
  sizeRecords: [
    { mean: 12.4, errorLow: 10.2, errorHigh: 14.6, reference: 'Ruiz 2024', link: null, species: 'Chromis viridis', n: 5 },
    { mean: 11.0, errorLow: 9.5, errorHigh: 12.5, reference: 'Leis 2006', link: null, species: 'Chromis viridis', n: 3 },
    { mean: 13.2, errorLow: null, errorHigh: null, reference: 'Victor 1986', link: null, species: 'Chromis viridis' },
  ],
  durationRecords: [],
  comparisonStats: {
    size: {
      species: { mean: 12.4, n: 3 },
      genus: { mean: 11.0, n: 8 },
      family: { mean: 9.6, n: 25 },
    },
    duration: { species: null, genus: null, family: null },
  },
};

describe('US-6.2: Dot-strip chart for pelagic juvenile size', () => {
  it('should render size panel title', () => {
    render(<PelagicJuvenilePanel data={dataWithSize} />);
    expect(screen.getByText('Pelagic Juvenile Size')).toBeInTheDocument();
  });

  it('should render a dot-strip chart', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    expect(container.querySelector('[data-testid="dot-strip-chart"]')).toBeInTheDocument();
  });

  it('should render one row per reference', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const rows = container.querySelectorAll('[data-testid="strip-row"]');
    expect(rows.length).toBe(3);
  });

  it('should render error bars for records with variance data', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const errorBars = container.querySelectorAll('[data-testid="error-bar"]');
    // First 2 records have error bars, third does not
    expect(errorBars.length).toBe(2);
  });

  it('should render dot points for all records', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const dots = container.querySelectorAll('[data-testid="dot-point"]');
    expect(dots.length).toBe(3);
  });

  it('should show summary stats (mean, range, records count)', () => {
    render(<PelagicJuvenilePanel data={dataWithSize} />);
    // Mean/Range/Records labels exist (may be multiple from both panels)
    expect(screen.getAllByText('Mean').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Range').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Records').length).toBeGreaterThanOrEqual(1);
    // 3 refs shown
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('should show comparison bars for species/genus/family', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const compBars = container.querySelector('[data-testid="comparison-bars"]');
    expect(compBars).toBeInTheDocument();
    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.getByText('Genus')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('should display "No size data available" when no size records', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText('No size data available')).toBeInTheDocument();
  });
});

// --- US-6.3 test data ---

const dataWithDuration: PelagicJuvenileData = {
  level: 'species',
  levelName: 'Chromis viridis',
  status: 'Known',
  keywords: ['post-larva'],
  genusSpecies: [],
  familySpecies: [],
  sizeRecords: [],
  durationRecords: [
    { mean: 18.5, errorLow: 14.0, errorHigh: 23.0, reference: 'Ruiz 2024', link: null, species: 'Chromis viridis', n: 4 },
    { mean: 16.2, errorLow: 12.0, errorHigh: 20.4, reference: 'Leis 2006', link: null, species: 'Chromis viridis', n: 3 },
    { mean: 22.0, errorLow: null, errorHigh: null, reference: 'Victor 1986', link: null, species: 'Chromis viridis' },
    { mean: 15.0, errorLow: 13.5, errorHigh: 16.5, reference: 'Wellington 1992', link: null, species: 'Chromis viridis', n: 6 },
  ],
  comparisonStats: {
    size: { species: null, genus: null, family: null },
    duration: {
      species: { mean: 18.5, n: 4 },
      genus: { mean: 16.2, n: 12 },
      family: { mean: 14.0, n: 40 },
    },
  },
};

const dataWithBoth: PelagicJuvenileData = {
  ...dataWithSize,
  durationRecords: dataWithDuration.durationRecords,
  comparisonStats: {
    size: dataWithSize.comparisonStats!.size,
    duration: dataWithDuration.comparisonStats!.duration,
  },
};

describe('US-6.3: Dot-strip chart for pelagic juvenile duration', () => {
  it('should render duration panel title', () => {
    render(<PelagicJuvenilePanel data={dataWithDuration} />);
    expect(screen.getByText('Pelagic Juvenile Duration')).toBeInTheDocument();
  });

  it('should render a dot-strip chart for duration', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const charts = container.querySelectorAll('[data-testid="dot-strip-chart"]');
    expect(charts.length).toBeGreaterThanOrEqual(1);
  });

  it('should render one strip row per duration reference', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const rows = container.querySelectorAll('[data-testid="strip-row"]');
    expect(rows.length).toBe(4); // 4 duration records
  });

  it('should render error bars for duration records with variance', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const errorBars = container.querySelectorAll('[data-testid="error-bar"]');
    // 3 out of 4 records have error bars
    expect(errorBars.length).toBe(3);
  });

  it('should show duration comparison bars', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const compBars = container.querySelectorAll('[data-testid="comparison-bars"]');
    expect(compBars.length).toBeGreaterThanOrEqual(1);
  });

  it('should display "No duration data available" when no duration records', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText('No duration data available')).toBeInTheDocument();
  });

  it('should render both size and duration charts when both have data', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithBoth} />);
    const charts = container.querySelectorAll('[data-testid="dot-strip-chart"]');
    expect(charts.length).toBe(2); // one for size, one for duration
  });

  it('should show unit "days" in duration summary stats', () => {
    render(<PelagicJuvenilePanel data={dataWithDuration} />);
    expect(screen.getAllByText('days').length).toBeGreaterThanOrEqual(1);
  });
});
