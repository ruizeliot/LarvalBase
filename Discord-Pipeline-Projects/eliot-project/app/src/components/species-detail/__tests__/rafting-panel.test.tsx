/**
 * Tests for Epic 7: Rafting section.
 *
 * US-7.1: Qualitative panel showing rafting status, flotsam type, stage,
 * and related species in genus/family.
 * US-7.2: Frequency barplots for qualitative traits (FLOATSAM, STAGE).
 * US-7.3: Barplot panels for rafter size and rafting age.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  RaftingPanel,
  type RaftingData,
  type RaftingQualitativeRecord,
} from '../rafting-panel';

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

// --- US-7.1 test data ---

const emptyStats = { mean: null, sd: null, min: null, max: null, n: 0 };

const sampleQualitativeRecords: RaftingQualitativeRecord[] = [
  { species: 'Kyphosus vaigiensis', flotsam: 'algae/plant', stage: 'J', extRef: null, reference: 'Current study', link: null },
  { species: 'Kyphosus vaigiensis', flotsam: 'FAD', stage: 'J | A', extRef: 'FB_789', reference: 'Castro et al. (2002)', link: 'https://doi.org/10.1234' },
];

const knownSpeciesData: RaftingData = {
  level: 'species',
  levelName: 'Kyphosus vaigiensis',
  status: 'Known',
  flotsamValues: ['algae/plant', 'FAD'],
  stageValues: ['J', 'J | A'],
  genusSpecies: ['Kyphosus cinerascens', 'Kyphosus bigibbus'],
  familySpecies: ['Girella punctata', 'Hermosilla azurea'],
  qualitativeRecords: sampleQualitativeRecords,
  sizeRecords: [],
  ageRecords: [],
  sizeStats: emptyStats,
  ageStats: emptyStats,
  comparisonStats: null,
};

const unknownSpeciesData: RaftingData = {
  level: 'species',
  levelName: 'Gobius niger',
  status: 'Unknown',
  flotsamValues: [],
  stageValues: [],
  genusSpecies: [],
  familySpecies: ['Gobius paganellus'],
  qualitativeRecords: [],
  sizeRecords: [],
  ageRecords: [],
  sizeStats: emptyStats,
  ageStats: emptyStats,
  comparisonStats: null,
};

describe('US-7.1: Rafting qualitative panel', () => {
  it('should render the rafting panel with data-testid', () => {
    const { container } = render(<RaftingPanel data={knownSpeciesData} />);
    expect(
      container.querySelector('[data-testid="rafting-panel"]')
    ).toBeInTheDocument();
  });

  it('should display "Known" status when species exists in rafting database', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText('Known')).toBeInTheDocument();
  });

  it('should display "Unknown" status when species has no rafting data', () => {
    render(<RaftingPanel data={unknownSpeciesData} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('should show flotsam values comma-separated', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText('algae/plant, FAD')).toBeInTheDocument();
  });

  it('should show stage values comma-separated', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText('J, J | A')).toBeInTheDocument();
  });

  it('should show "None" when no flotsam values exist', () => {
    render(<RaftingPanel data={unknownSpeciesData} />);
    // Two "None" labels — one for flotsam, one for stage
    const noneElements = screen.getAllByText('None');
    expect(noneElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should list known rafters in genus in italic', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText(/Kyphosus cinerascens/)).toBeInTheDocument();
    expect(screen.getByText(/Kyphosus bigibbus/)).toBeInTheDocument();
  });

  it('should list known rafters in family (excluding same genus)', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText(/Girella punctata/)).toBeInTheDocument();
    expect(screen.getByText(/Hermosilla azurea/)).toBeInTheDocument();
  });

  it('should show "None known" when no genus species exist', () => {
    render(<RaftingPanel data={unknownSpeciesData} />);
    const noneKnownElements = screen.getAllByText('None known');
    expect(noneKnownElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show section label "Rafting"', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    // The card header label
    const labels = screen.getAllByText('Rafting');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('should show "Flotsam type" and "Stage" labels', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText('Flotsam type')).toBeInTheDocument();
    expect(screen.getByText('Stage')).toBeInTheDocument();
  });

  it('should show "X records" link in qualitative panel', () => {
    const { container } = render(<RaftingPanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    expect(link).toBeInTheDocument();
    expect(link!.textContent).toContain('2 records');
  });

  it('should open qualitative records table with correct columns', () => {
    const { container } = render(<RaftingPanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    fireEvent.click(link!);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Flotsam')).toBeInTheDocument();
    expect(screen.getAllByText('Stage').length).toBeGreaterThanOrEqual(2); // label + header
    expect(screen.getByText('External references')).toBeInTheDocument();
    expect(screen.getByText('Main reference')).toBeInTheDocument();
  });

  it('should render reference as hyperlink in qualitative table', () => {
    const { container } = render(<RaftingPanel data={knownSpeciesData} />);
    const link = container.querySelector('[data-testid="qualitative-records-link"]');
    fireEvent.click(link!);

    const refLink = screen.getByText('Castro et al. (2002)').closest('a');
    expect(refLink).toHaveAttribute('href', 'https://doi.org/10.1234');
    expect(refLink).toHaveAttribute('target', '_blank');
  });
});

// --- US-7.2 test data ---

const dataWithFrequencies: RaftingData = {
  ...knownSpeciesData,
  flotsamFrequencies: [
    { value: 'FAD', count: 8 },
    { value: 'algae/plant', count: 5 },
    { value: 'plastic', count: 3 },
  ],
  stageFrequencies: [
    { value: 'J', count: 9 },
    { value: 'A', count: 4 },
    { value: 'L', count: 2 },
  ],
};

describe('US-7.2: Frequency barplots for qualitative rafting traits', () => {
  it('should render flotsam frequency barplot when data exists', () => {
    const { container } = render(<RaftingPanel data={dataWithFrequencies} />);
    expect(container.querySelector('[data-testid="flotsam-barplot"]')).toBeInTheDocument();
  });

  it('should render stage frequency barplot when data exists', () => {
    const { container } = render(<RaftingPanel data={dataWithFrequencies} />);
    expect(container.querySelector('[data-testid="stage-barplot"]')).toBeInTheDocument();
  });

  it('should display flotsam frequency values with counts', () => {
    render(<RaftingPanel data={dataWithFrequencies} />);
    expect(screen.getByText('FAD')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display stage frequency values with counts', () => {
    render(<RaftingPanel data={dataWithFrequencies} />);
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render frequency bar fills', () => {
    const { container } = render(<RaftingPanel data={dataWithFrequencies} />);
    const bars = container.querySelectorAll('[data-testid="freq-bar-fill"]');
    // 3 flotsam bars + 3 stage bars = 6
    expect(bars.length).toBe(6);
  });

  it('should use green #00BA38 color for all frequency bars', () => {
    const { container } = render(<RaftingPanel data={dataWithFrequencies} />);
    const bars = container.querySelectorAll('[data-testid="freq-bar-fill"]');
    bars.forEach((bar) => {
      expect((bar as HTMLElement).style.backgroundColor).toBe('rgb(0, 186, 56)');
    });
  });

  it('should not render barplots when no frequency data exists', () => {
    const { container } = render(<RaftingPanel data={knownSpeciesData} />);
    expect(container.querySelector('[data-testid="flotsam-barplot"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="stage-barplot"]')).not.toBeInTheDocument();
  });

  it('should handle species/genus/family fallback for frequency data', () => {
    const genusData: RaftingData = {
      ...knownSpeciesData,
      level: 'genus',
      levelName: 'Kyphosus',
      flotsamFrequencies: [
        { value: 'algae/plant', count: 12 },
      ],
      stageFrequencies: [
        { value: 'J', count: 15 },
      ],
    };
    const { container } = render(<RaftingPanel data={genusData} />);
    expect(container.querySelector('[data-testid="flotsam-barplot"]')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});

// --- US-7.3 test data ---

const dataWithSize: RaftingData = {
  level: 'species',
  levelName: 'Kyphosus vaigiensis',
  status: 'Known',
  flotsamValues: ['algae/plant'],
  stageValues: ['J'],
  genusSpecies: [],
  familySpecies: [],
  qualitativeRecords: [],
  sizeRecords: [
    { mean: 78.0, errorLow: null, errorHigh: null, reference: 'Current study', link: null, species: 'Kyphosus vaigiensis', extRef: null, lengthType: 'TL', rawMin: null, rawMax: null, meanType: 'mean', conf: null, confType: null },
    { mean: 45.5, errorLow: 30.0, errorHigh: 61.0, reference: 'Castro et al. (2002)', link: 'https://doi.org/10.1234', species: 'Kyphosus vaigiensis', extRef: 'FB_456', lengthType: 'SL', rawMin: 30.0, rawMax: 61.0, meanType: 'mean', conf: null, confType: null },
    { mean: 52.0, errorLow: null, errorHigh: null, reference: 'Thiel 2003', link: null, species: 'Kyphosus vaigiensis', extRef: null, lengthType: null, rawMin: null, rawMax: null, meanType: null, conf: null, confType: null },
  ],
  ageRecords: [],
  sizeStats: {
    mean: 58.50,
    sd: 17.10,
    min: 30.0,
    max: 78.0,
    n: 3,
  },
  ageStats: emptyStats,
  comparisonStats: {
    size: {
      species: { mean: 58.5, n: 3, speciesCount: 1 },
      genus: { mean: 50.2, n: 10, speciesCount: 4 },
      family: { mean: 42.0, n: 30, speciesCount: 12 },
    },
    age: { species: null, genus: null, family: null },
  },
  currentSpeciesId: 'kyphosus-vaigiensis',
  sizeBarChart: {
    entries: [
      { speciesId: 'kyphosus-vaigiensis', speciesName: 'Kyphosus vaigiensis', meanValue: 58.5 },
      { speciesId: 'kyphosus-cinerascens', speciesName: 'Kyphosus cinerascens', meanValue: 42.0 },
      { speciesId: 'kyphosus-bigibbus', speciesName: 'Kyphosus bigibbus', meanValue: 38.5 },
    ],
    comparisonType: 'family',
    taxonomyName: 'Kyphosidae',
  },
  ageBarChart: null,
};

describe('US-7.3: Barplots for rafting size and age', () => {
  it('should render size panel title', () => {
    render(<RaftingPanel data={dataWithSize} />);
    expect(screen.getByText('Rafting Size')).toBeInTheDocument();
  });

  it('should render a family bar chart for size', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    expect(container.querySelector('[data-testid="family-bar-chart"]')).toBeInTheDocument();
  });

  it('should render bar entries for each species in comparison', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const entries = container.querySelectorAll('[data-testid="bar-entry"]');
    expect(entries.length).toBe(3);
  });

  it('should highlight current species in bar chart', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const highlighted = container.querySelector('[data-testid="bar-entry"][data-highlight="true"]');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted!.textContent).toContain('Kyphosus vaigiensis');
  });

  it('should show mean ± SD in TraitCard format', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const traitValue = container.querySelector('[data-testid="trait-value"]');
    expect(traitValue).toBeInTheDocument();
    expect(traitValue!.textContent).toContain('58.50');
    expect(traitValue!.textContent).toContain('±');
    expect(traitValue!.textContent).toContain('17.10');
  });

  it('should show range and N records link', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    expect(screen.getByText(/Range:/)).toBeInTheDocument();
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    expect(recordsLink).toBeInTheDocument();
    expect(recordsLink!.textContent).toContain('3 records');
  });

  it('should show genus and family comparison text with n_sp', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const compText = container.querySelector('[data-testid="comparison-text"]');
    expect(compText).toBeInTheDocument();
    expect(screen.getByText('Genus average:')).toBeInTheDocument();
    expect(screen.getByText('Family average:')).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 4/)).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 12/)).toBeInTheDocument();
  });

  it('should display "No rafting size data available" when no size records', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText(/no rafting size data available/i)).toBeInTheDocument();
  });

  it('should show detail table with correct SIZE columns when records link clicked', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Mean type')).toBeInTheDocument();
    expect(screen.getByText('External references')).toBeInTheDocument();
    expect(screen.getByText('Main reference')).toBeInTheDocument();
  });

  it('should show mean, min, max values in size detail table', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    expect(screen.getByText('78.00')).toBeInTheDocument();
    expect(screen.getByText('45.50')).toBeInTheDocument();
    expect(screen.getByText('30.00')).toBeInTheDocument();
    expect(screen.getByText('61.00')).toBeInTheDocument();
    expect(screen.getByText('FB_456')).toBeInTheDocument();
  });

  it('should render reference as hyperlink in size detail table', () => {
    const { container } = render(<RaftingPanel data={dataWithSize} />);
    const recordsLink = container.querySelector('[data-testid="records-link"]');
    fireEvent.click(recordsLink!);

    const refLink = screen.getByText('Castro et al. (2002)').closest('a');
    expect(refLink).toHaveAttribute('href', 'https://doi.org/10.1234');
  });

  // --- Age panel tests ---

  const dataWithAge: RaftingData = {
    level: 'species',
    levelName: 'Kyphosus vaigiensis',
    status: 'Known',
    flotsamValues: ['algae/plant'],
    stageValues: ['J'],
    genusSpecies: [],
    familySpecies: [],
    qualitativeRecords: [],
    sizeRecords: [],
    ageRecords: [
      { mean: 35.0, errorLow: null, errorHigh: null, reference: 'Current study', link: null, species: 'Kyphosus vaigiensis', extRef: null, rawMin: null, rawMax: null, meanType: null, conf: null, confType: null },
      { mean: 22.0, errorLow: 15.0, errorHigh: 29.0, reference: 'Castro et al. (2002)', link: 'https://doi.org/10.5678', species: 'Kyphosus vaigiensis', extRef: 'FB_789', rawMin: 15.0, rawMax: 29.0, meanType: 'mean', conf: null, confType: null },
    ],
    sizeStats: emptyStats,
    ageStats: {
      mean: 28.50,
      sd: 9.19,
      min: 15.0,
      max: 35.0,
      n: 2,
    },
    comparisonStats: {
      size: { species: null, genus: null, family: null },
      age: {
        species: { mean: 28.5, n: 2, speciesCount: 1 },
        genus: { mean: 25.0, n: 6, speciesCount: 3 },
        family: { mean: 20.0, n: 18, speciesCount: 9 },
      },
    },
    currentSpeciesId: 'kyphosus-vaigiensis',
    sizeBarChart: null,
    ageBarChart: {
      entries: [
        { speciesId: 'kyphosus-vaigiensis', speciesName: 'Kyphosus vaigiensis', meanValue: 28.5 },
        { speciesId: 'kyphosus-cinerascens', speciesName: 'Kyphosus cinerascens', meanValue: 20.0 },
      ],
      comparisonType: 'genus',
      taxonomyName: 'Kyphosus',
    },
  };

  it('should render age panel title', () => {
    render(<RaftingPanel data={dataWithAge} />);
    expect(screen.getByText('Rafting Age')).toBeInTheDocument();
  });

  it('should render a family bar chart for age', () => {
    const { container } = render(<RaftingPanel data={dataWithAge} />);
    const charts = container.querySelectorAll('[data-testid="family-bar-chart"]');
    expect(charts.length).toBeGreaterThanOrEqual(1);
  });

  it('should show mean ± SD for age in TraitCard format', () => {
    const { container } = render(<RaftingPanel data={dataWithAge} />);
    const traitValues = container.querySelectorAll('[data-testid="trait-value"]');
    const ageValue = Array.from(traitValues).find(el => el.textContent?.includes('28.50'));
    expect(ageValue).toBeTruthy();
    expect(ageValue!.textContent).toContain('±');
  });

  it('should show unit "days" in age panel', () => {
    render(<RaftingPanel data={dataWithAge} />);
    expect(screen.getAllByText('days').length).toBeGreaterThanOrEqual(1);
  });

  it('should show age comparison text with n_sp', () => {
    render(<RaftingPanel data={dataWithAge} />);
    expect(screen.getByText('Genus average:')).toBeInTheDocument();
    expect(screen.getByText('Family average:')).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 3/)).toBeInTheDocument();
    expect(screen.getByText(/n_sp = 9/)).toBeInTheDocument();
  });

  it('should display "No rafting age data available" when no age records', () => {
    render(<RaftingPanel data={knownSpeciesData} />);
    expect(screen.getByText(/no rafting age data available/i)).toBeInTheDocument();
  });

  it('should show clickable N records link for age', () => {
    const { container } = render(<RaftingPanel data={dataWithAge} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    expect(recordsLinks.length).toBeGreaterThanOrEqual(1);
    const ageLink = Array.from(recordsLinks).find(el => el.textContent?.includes('2 records'));
    expect(ageLink).toBeTruthy();
  });

  it('should show detail table with correct AGE columns', () => {
    const { container } = render(<RaftingPanel data={dataWithAge} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    const ageLink = Array.from(recordsLinks).find(el => el.textContent?.includes('2 records'));
    fireEvent.click(ageLink!);

    const headers = document.querySelectorAll('[role="dialog"] th');
    const headerTexts = Array.from(headers).map(h => h.textContent);
    expect(headerTexts).toContain('Name');
    expect(headerTexts).toContain('Mean');
    expect(headerTexts).toContain('Min');
    expect(headerTexts).toContain('Max');
    expect(headerTexts).toContain('Mean type');
    expect(headerTexts).toContain('External references');
    expect(headerTexts).toContain('Main reference');
  });

  it('should render reference as hyperlink in age detail table', () => {
    const { container } = render(<RaftingPanel data={dataWithAge} />);
    const recordsLinks = container.querySelectorAll('[data-testid="records-link"]');
    const ageLink = Array.from(recordsLinks).find(el => el.textContent?.includes('2 records'));
    fireEvent.click(ageLink!);

    const refLink = screen.getByText('Castro et al. (2002)').closest('a');
    expect(refLink).toHaveAttribute('href', 'https://doi.org/10.5678');
  });
});
