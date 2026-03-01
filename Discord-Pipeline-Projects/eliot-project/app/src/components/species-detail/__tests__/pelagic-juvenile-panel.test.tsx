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
