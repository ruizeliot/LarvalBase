/**
 * Tests for Epic 6: Pelagic Juvenile section.
 *
 * US-6.1: Qualitative panel showing known/unknown status, keywords,
 * and related species in genus/family.
 * US-6.2/6.3: Numeric panels with TraitCard-style layout.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PelagicJuvenilePanel,
  type PelagicJuvenileData,
} from '../pelagic-juvenile-panel';

// --- US-6.1 test data ---

const emptyStats = { mean: null, sd: null, min: null, max: null, n: 0 };

const knownSpeciesData: PelagicJuvenileData = {
  level: 'species',
  levelName: 'Chromis viridis',
  status: 'Known',
  keywords: ['acronurus', 'post-larva'],
  genusSpecies: ['Chromis atripectoralis', 'Chromis margaritifer'],
  familySpecies: ['Dascyllus aruanus', 'Pomacentrus pavo'],
  sizeRecords: [],
  durationRecords: [],
  sizeStats: emptyStats,
  durationStats: emptyStats,
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
  sizeStats: emptyStats,
  durationStats: emptyStats,
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
  sizeStats: emptyStats,
  durationStats: emptyStats,
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
  sizeStats: {
    // mean of [12.4, 11.0, 13.2] = 12.2, sd ≈ 1.11
    mean: 12.2,
    sd: 1.11,
    min: 9.5,
    max: 14.6,
    n: 3,
  },
  durationStats: emptyStats,
  comparisonStats: {
    size: {
      species: { mean: 12.4, n: 3, speciesCount: 1 },
      genus: { mean: 11.0, n: 8, speciesCount: 5 },
      family: { mean: 9.6, n: 25, speciesCount: 14 },
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

  it('should show mean ± SD in TraitCard format', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const traitValue = container.querySelector('[data-testid="trait-value"]');
    expect(traitValue).toBeInTheDocument();
    // Should show "12.20 ± 1.11"
    expect(traitValue!.textContent).toContain('12.20');
    expect(traitValue!.textContent).toContain('±');
    expect(traitValue!.textContent).toContain('1.11');
  });

  it('should show range and N records link', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    // Range
    expect(screen.getByText(/Range:/)).toBeInTheDocument();
    // N records link
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    expect(recordsLink).toBeInTheDocument();
    expect(recordsLink!.textContent).toContain('3 records');
  });

  it('should show genus and family comparison text with n_sp', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const compText = container.querySelector('[data-testid="comparison-text"]');
    expect(compText).toBeInTheDocument();
    expect(screen.getByText('Genus average:')).toBeInTheDocument();
    expect(screen.getByText('Family average:')).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 5/)).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 14/)).toBeInTheDocument();
  });

  it('should display "No pelagic juvenile size data available" when no size records', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText(/no pelagic juvenile size data available/i)).toBeInTheDocument();
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
  sizeStats: emptyStats,
  durationStats: {
    // mean of [18.5, 16.2, 22.0, 15.0] = 17.925, sd ≈ 3.06
    mean: 17.93,
    sd: 3.06,
    min: 12.0,
    max: 23.0,
    n: 4,
  },
  comparisonStats: {
    size: { species: null, genus: null, family: null },
    duration: {
      species: { mean: 18.5, n: 4, speciesCount: 1 },
      genus: { mean: 16.2, n: 12, speciesCount: 8 },
      family: { mean: 14.0, n: 40, speciesCount: 22 },
    },
  },
};

const dataWithBoth: PelagicJuvenileData = {
  ...dataWithSize,
  durationRecords: dataWithDuration.durationRecords,
  durationStats: dataWithDuration.durationStats,
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

  it('should show mean ± SD for duration in TraitCard format', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const traitValues = container.querySelectorAll('[data-testid="trait-value"]');
    // Duration panel trait value should contain the mean and SD
    const durationValue = Array.from(traitValues).find(el => el.textContent?.includes('17.93'));
    expect(durationValue).toBeTruthy();
    expect(durationValue!.textContent).toContain('±');
  });

  it('should show duration comparison text with n_sp', () => {
    render(<PelagicJuvenilePanel data={dataWithDuration} />);
    expect(screen.getByText('Genus average:')).toBeInTheDocument();
    expect(screen.getByText('Family average:')).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 8/)).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 22/)).toBeInTheDocument();
  });

  it('should display "No pelagic juvenile duration data available" when no duration records', () => {
    render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    expect(screen.getByText(/no pelagic juvenile duration data available/i)).toBeInTheDocument();
  });

  it('should render both size and duration charts when both have data', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithBoth} />);
    const charts = container.querySelectorAll('[data-testid="dot-strip-chart"]');
    expect(charts.length).toBe(2); // one for size, one for duration
  });

  it('should show unit "days" in duration panel', () => {
    render(<PelagicJuvenilePanel data={dataWithDuration} />);
    expect(screen.getAllByText('days').length).toBeGreaterThanOrEqual(1);
  });

  it('should show clickable N records link for raw data table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    // At least one records link (duration panel)
    expect(recordsLinks.length).toBeGreaterThanOrEqual(1);
    const durationLink = Array.from(recordsLinks).find(el => el.textContent?.includes('4 records'));
    expect(durationLink).toBeTruthy();
  });
});
