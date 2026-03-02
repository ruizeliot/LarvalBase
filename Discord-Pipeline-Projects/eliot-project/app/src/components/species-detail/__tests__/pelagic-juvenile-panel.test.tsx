/**
 * Tests for Epic 6: Pelagic Juvenile section.
 *
 * US-6.1: Qualitative panel showing known/unknown status, keywords,
 * and related species in genus/family.
 * US-6.2/6.3: Numeric panels with barplot comparison and detail tables.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PelagicJuvenilePanel,
  type PelagicJuvenileData,
  type QualitativeRecord,
} from '../pelagic-juvenile-panel';

// Mock FamilyBarChart since it uses Recharts which doesn't render in jsdom
vi.mock('../family-bar-chart', () => ({
  FamilyBarChart: ({ data, currentSpeciesId, comparisonType, taxonomyName }: {
    data: { speciesId: string; speciesName: string; meanValue: number }[];
    currentSpeciesId: string;
    comparisonType: string;
    taxonomyName: string;
  }) => (
    <div data-testid="family-bar-chart" data-species-count={data.length} data-comparison-type={comparisonType} data-taxonomy={taxonomyName}>
      {data.map(d => (
        <div key={d.speciesId} data-testid="bar-entry" data-highlight={d.speciesId === currentSpeciesId ? 'true' : 'false'}>
          {d.speciesName}: {d.meanValue.toFixed(2)}
        </div>
      ))}
    </div>
  ),
}));

// --- US-6.1 test data ---

const emptyStats = { mean: null, sd: null, min: null, max: null, n: 0 };

const sampleQualitativeRecords: QualitativeRecord[] = [
  { species: 'Chromis viridis', keyword: 'acronurus', remarks: 'Reef flat', extRef: 'FB_123', reference: 'Ruiz 2024', link: null },
  { species: 'Chromis viridis', keyword: 'post-larva', remarks: null, extRef: null, reference: 'Leis 2006', link: 'https://doi.org/10.1234' },
];

const knownSpeciesData: PelagicJuvenileData = {
  level: 'species',
  levelName: 'Chromis viridis',
  status: 'Known',
  keywords: ['acronurus', 'post-larva'],
  genusSpecies: ['Chromis atripectoralis', 'Chromis margaritifer'],
  familySpecies: ['Dascyllus aruanus', 'Pomacentrus pavo'],
  qualitativeRecords: sampleQualitativeRecords,
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
  qualitativeRecords: [],
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

  it('should show "X records" link in qualitative panel', () => {
    const { container } = render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    expect(link).toBeInTheDocument();
    expect(link!.textContent).toContain('2 records');
  });

  it('should place records link right after the status (at the top)', () => {
    const { container } = render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    const statusEl = screen.getByText('Known');
    const recordsLink = container.querySelector('[data-testid="qualitative-records-link"]');
    const statusSection = statusEl.closest('.border-b');
    expect(statusSection).toBeInTheDocument();
    expect(statusSection!.contains(recordsLink)).toBe(true);
  });

  it('should open qualitative records table with correct columns', () => {
    const { container } = render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    fireEvent.click(link!);

    // Check qualitative columns
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Key word')).toBeInTheDocument();
    expect(screen.getByText('Remarks')).toBeInTheDocument();
    expect(screen.getByText('External references')).toBeInTheDocument();
    expect(screen.getByText('Main reference')).toBeInTheDocument();
  });

  it('should show VALID_NAME in qualitative table Name column', () => {
    const { container } = render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    fireEvent.click(link!);

    expect(screen.getAllByText('Chromis viridis').length).toBeGreaterThanOrEqual(1);
  });

  it('should render reference as hyperlink in qualitative table', () => {
    const { container } = render(<PelagicJuvenilePanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    fireEvent.click(link!);

    const refLink = screen.getByText('Leis 2006').closest('a');
    expect(refLink).toHaveAttribute('href', 'https://doi.org/10.1234');
    expect(refLink).toHaveAttribute('target', '_blank');
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
  qualitativeRecords: [],
  sizeRecords: [
    { mean: 12.4, errorLow: 10.2, errorHigh: 14.6, reference: 'Ruiz 2024', link: null, species: 'Chromis viridis', n: 5, keyword: 'post-larva', remarks: 'Reef flat', extRef: 'FB_123', lengthType: 'SL', conf: 2.2, confType: 'SD', rawMin: 10.2, rawMax: 14.6, meanType: 'Mean' },
    { mean: 11.0, errorLow: 9.5, errorHigh: 12.5, reference: 'Leis 2006', link: 'https://doi.org/10.1234', species: 'Chromis viridis', n: 3, keyword: 'acronurus', remarks: null, extRef: null, lengthType: 'TL', conf: 1.5, confType: 'SE', rawMin: 9.5, rawMax: 12.5, meanType: 'Median' },
    { mean: 13.2, errorLow: null, errorHigh: null, reference: 'Victor 1986', link: null, species: 'Chromis viridis', keyword: null, remarks: null, extRef: null, lengthType: null, conf: null, confType: null, rawMin: null, rawMax: null, meanType: null },
  ],
  durationRecords: [],
  sizeStats: {
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
  currentSpeciesId: 'chromis-viridis',
  sizeBarChart: {
    entries: [
      { speciesId: 'chromis-viridis', speciesName: 'Chromis viridis', meanValue: 12.2 },
      { speciesId: 'chromis-atripectoralis', speciesName: 'Chromis atripectoralis', meanValue: 10.8 },
      { speciesId: 'dascyllus-aruanus', speciesName: 'Dascyllus aruanus', meanValue: 8.5 },
    ],
    comparisonType: 'family',
    taxonomyName: 'Pomacentridae',
  },
  durationBarChart: null,
};

describe('US-6.2: Barplot for pelagic juvenile size', () => {
  it('should render size panel title', () => {
    render(<PelagicJuvenilePanel data={dataWithSize} />);
    expect(screen.getByText('Pelagic Juvenile Size')).toBeInTheDocument();
  });

  it('should render a family bar chart instead of dot-strip', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    expect(container.querySelector('[data-testid="family-bar-chart"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="dot-strip-chart"]')).not.toBeInTheDocument();
  });

  it('should render bar entries for each species in comparison', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const entries = container.querySelectorAll('[data-testid="bar-entry"]');
    expect(entries.length).toBe(3);
  });

  it('should highlight current species in bar chart', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const highlighted = container.querySelector('[data-testid="bar-entry"][data-highlight="true"]');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted!.textContent).toContain('Chromis viridis');
  });

  it('should show bar chart with family comparison type', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const chart = container.querySelector('[data-testid="family-bar-chart"]');
    expect(chart?.getAttribute('data-comparison-type')).toBe('family');
    expect(chart?.getAttribute('data-taxonomy')).toBe('Pomacentridae');
  });

  it('should show mean ± SD in TraitCard format', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const traitValue = container.querySelector('[data-testid="trait-value"]');
    expect(traitValue).toBeInTheDocument();
    expect(traitValue!.textContent).toContain('12.20');
    expect(traitValue!.textContent).toContain('±');
    expect(traitValue!.textContent).toContain('1.11');
  });

  it('should show range and N records link', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    expect(screen.getByText(/Range:/)).toBeInTheDocument();
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

  it('should show detail table with correct SIZE columns when records link clicked', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    // Check SIZE-specific columns: Name, Mean, Min, Max, CI, Mean type, CI type, Ext Ref, Main reference
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Confidence interval')).toBeInTheDocument();
    expect(screen.getByText('Mean type')).toBeInTheDocument();
    expect(screen.getByText('Confidence interval type')).toBeInTheDocument();
    expect(screen.getByText('External references')).toBeInTheDocument();
    expect(screen.getByText('Main reference')).toBeInTheDocument();
    // Remarks column should NOT be present
    expect(screen.queryByRole('columnheader', { name: 'Remarks' })).not.toBeInTheDocument();
  });

  it('should show VALID_NAME (not keyword) in size detail table Name column', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    // Name column should show VALID_NAME (Chromis viridis), not keyword
    // Dialog renders in a portal, so query document.body
    const rows = document.querySelectorAll('[role="dialog"] tbody tr');
    const firstRowCells = rows[0]?.querySelectorAll('td');
    expect(firstRowCells?.[0]?.textContent).toBe('Chromis viridis');
  });

  it('should show mean, min, max, conf, meanType, extRef in size detail table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    // First record: mean=12.4, min=10.2, max=14.6, conf=2.2, meanType=Mean, extRef=FB_123
    expect(screen.getByText('12.40')).toBeInTheDocument();
    expect(screen.getByText('10.20')).toBeInTheDocument();
    expect(screen.getByText('14.60')).toBeInTheDocument();
    expect(screen.getByText('2.20')).toBeInTheDocument();
    expect(screen.getByText('FB_123')).toBeInTheDocument();
    expect(screen.getAllByText('Mean').length).toBeGreaterThanOrEqual(1);
    // Second record: lengthType=TL (Mean type column)
    expect(screen.getByText('SL')).toBeInTheDocument();
    expect(screen.getByText('TL')).toBeInTheDocument();
  });

  it('should render reference as hyperlink when link is present in size detail table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    const refLink = screen.getByText('Leis 2006').closest('a');
    expect(refLink).toHaveAttribute('href', 'https://doi.org/10.1234');
    expect(refLink).toHaveAttribute('target', '_blank');
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
  qualitativeRecords: [],
  sizeRecords: [],
  durationRecords: [
    { mean: 18.5, errorLow: 14.0, errorHigh: 23.0, reference: 'Ruiz 2024', link: null, species: 'Chromis viridis', n: 4, keyword: 'post-larva', remarks: 'Lagoon site', extRef: 'FB_456', conf: 4.5, confType: 'SD', rawMin: 14.0, rawMax: 23.0, meanType: 'Mean' },
    { mean: 16.2, errorLow: 12.0, errorHigh: 20.4, reference: 'Leis 2006', link: 'https://doi.org/10.5678', species: 'Chromis viridis', n: 3, keyword: 'acronurus', remarks: null, extRef: null, conf: 4.2, confType: 'SE', rawMin: 12.0, rawMax: 20.4, meanType: null },
    { mean: 22.0, errorLow: null, errorHigh: null, reference: 'Victor 1986', link: null, species: 'Chromis viridis', keyword: null, remarks: null, extRef: null, conf: null, confType: null, rawMin: null, rawMax: null, meanType: null },
    { mean: 15.0, errorLow: 13.5, errorHigh: 16.5, reference: 'Wellington 1992', link: null, species: 'Chromis viridis', n: 6, keyword: 'juvenile', remarks: 'Outer reef', extRef: 'WoRMS_789', conf: 1.5, confType: 'CI', rawMin: 13.5, rawMax: 16.5, meanType: 'Mean' },
  ],
  sizeStats: emptyStats,
  durationStats: {
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
  currentSpeciesId: 'chromis-viridis',
  sizeBarChart: null,
  durationBarChart: {
    entries: [
      { speciesId: 'chromis-viridis', speciesName: 'Chromis viridis', meanValue: 17.93 },
      { speciesId: 'chromis-atripectoralis', speciesName: 'Chromis atripectoralis', meanValue: 15.0 },
    ],
    comparisonType: 'genus',
    taxonomyName: 'Chromis',
  },
};

const dataWithBoth: PelagicJuvenileData = {
  ...dataWithSize,
  qualitativeRecords: [],
  durationRecords: dataWithDuration.durationRecords,
  durationStats: dataWithDuration.durationStats,
  durationBarChart: dataWithDuration.durationBarChart,
  comparisonStats: {
    size: dataWithSize.comparisonStats!.size,
    duration: dataWithDuration.comparisonStats!.duration,
  },
};

describe('US-6.3: Barplot for pelagic juvenile duration', () => {
  it('should render duration panel title', () => {
    render(<PelagicJuvenilePanel data={dataWithDuration} />);
    expect(screen.getByText('Pelagic Juvenile Duration')).toBeInTheDocument();
  });

  it('should render a family bar chart for duration', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const charts = container.querySelectorAll('[data-testid="family-bar-chart"]');
    expect(charts.length).toBeGreaterThanOrEqual(1);
  });

  it('should show mean ± SD for duration in TraitCard format', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const traitValues = container.querySelectorAll('[data-testid="trait-value"]');
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

  it('should render both bar charts when both size and duration have data', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithBoth} />);
    const charts = container.querySelectorAll('[data-testid="family-bar-chart"]');
    expect(charts.length).toBe(2);
  });

  it('should show unit "days" in duration panel', () => {
    render(<PelagicJuvenilePanel data={dataWithDuration} />);
    expect(screen.getAllByText('days').length).toBeGreaterThanOrEqual(1);
  });

  it('should show clickable N records link for raw data table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    expect(recordsLinks.length).toBeGreaterThanOrEqual(1);
    const durationLink = Array.from(recordsLinks).find(el => el.textContent?.includes('4 records'));
    expect(durationLink).toBeTruthy();
  });

  it('should show detail table with correct DURATION columns', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    // Click the duration records link
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    const durationLink = Array.from(recordsLinks).find(el => el.textContent?.includes('4 records'));
    fireEvent.click(durationLink!);

    // Check DURATION columns: Name, Mean, Min, Max, CI, Mean type, CI type, Ext Ref, Main reference
    // "Mean" appears as both header and cell value, so check header count
    const headers = document.querySelectorAll('[role="dialog"] th');
    const headerTexts = Array.from(headers).map(h => h.textContent);
    expect(headerTexts).toContain('Name');
    expect(headerTexts).toContain('Mean');
    expect(headerTexts).toContain('Min');
    expect(headerTexts).toContain('Max');
    expect(headerTexts).toContain('Confidence interval');
    expect(headerTexts).toContain('Mean type');
    expect(headerTexts).toContain('Confidence interval type');
    expect(headerTexts).toContain('External references');
    expect(headerTexts).toContain('Main reference');
    // Remarks column should NOT be present
    expect(headerTexts).not.toContain('Remarks');
  });

  it('should show VALID_NAME (not keyword) in duration detail table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    const durationLink = Array.from(recordsLinks).find(el => el.textContent?.includes('4 records'));
    fireEvent.click(durationLink!);

    // Dialog renders in a portal, so query document.body
    const rows = document.querySelectorAll('[role="dialog"] tbody tr');
    const firstRowCells = rows[0]?.querySelectorAll('td');
    expect(firstRowCells?.[0]?.textContent).toBe('Chromis viridis');
  });

  it('should show mean, min, max, conf, meanType, extRef in duration detail table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    const durationLink = Array.from(recordsLinks).find(el => el.textContent?.includes('4 records'));
    fireEvent.click(durationLink!);

    // First record: mean=18.5, min=14.0, max=23.0, conf=4.5
    expect(screen.getByText('18.50')).toBeInTheDocument();
    expect(screen.getByText('14.00')).toBeInTheDocument();
    expect(screen.getByText('23.00')).toBeInTheDocument();
    expect(screen.getByText('4.50')).toBeInTheDocument();
    expect(screen.getByText('FB_456')).toBeInTheDocument();
  });

  it('should render reference as hyperlink when link is present in duration detail table', () => {
    const { container } = render(<PelagicJuvenilePanel data={dataWithDuration} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    const durationLink = Array.from(recordsLinks).find(el => el.textContent?.includes('4 records'));
    fireEvent.click(durationLink!);

    const refLink = screen.getByText('Leis 2006').closest('a');
    expect(refLink).toHaveAttribute('href', 'https://doi.org/10.5678');
    expect(refLink).toHaveAttribute('target', '_blank');
  });
});
