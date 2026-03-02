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
