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
