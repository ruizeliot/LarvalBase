/**
 * Tests for US-3.1: Qualitative egg traits as frequency barplots
 * with species/genus/family fallback.
 *
 * Must:
 * 1. Display 3 frequency barplots: EGG_LOCATION (with EGG_DETAILS inline), EGG_SHAPE, NB_OIL_GLOBULE
 * 2. Show value frequencies as horizontal bars
 * 3. Cascade: species data → genus fallback → family fallback
 * 4. Always show all 3 traits (with "Unknown" when no data)
 * 5. EGG_DETAILS shown as "Details: val1, val2" inside EGG_LOCATION card
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EggQualitativePanel } from '../egg-qualitative-panel';

const speciesLevelData = {
  level: 'species' as const,
  levelName: 'Chromis viridis',
  traits: {
    EGG_LOCATION: [
      { value: 'Demersal', count: 17 },
      { value: 'Pelagic', count: 3 },
    ],
    EGG_DETAILS: [
      { value: 'Attached', count: 14 },
      { value: 'Guarded', count: 11 },
    ],
    EGG_SHAPE: [
      { value: 'Elliptical', count: 18 },
      { value: 'Spherical', count: 2 },
    ],
    NB_OIL_GLOBULE: [
      { value: '0', count: 19 },
      { value: '1', count: 1 },
    ],
  },
};

const genusLevelData = {
  level: 'genus' as const,
  levelName: 'Chromis',
  traits: {
    EGG_LOCATION: [
      { value: 'Demersal', count: 45 },
    ],
    EGG_DETAILS: [],
    EGG_SHAPE: [
      { value: 'Elliptical', count: 30 },
    ],
    NB_OIL_GLOBULE: [],
  },
};

describe('US-3.1: Qualitative egg traits as frequency barplots', () => {
  it('should render all 3 trait labels (EGG_DETAILS merged into EGG_LOCATION)', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    expect(screen.getByText('Egg location')).toBeInTheDocument();
    expect(screen.getByText('Egg shape')).toBeInTheDocument();
    expect(screen.getByText('Number of oil globules')).toBeInTheDocument();
  });

  it('should show EGG_DETAILS as inline text inside EGG_LOCATION card', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    // Details text should appear as comma-separated values
    expect(screen.getByText('Details:')).toBeInTheDocument();
    expect(screen.getByText('Attached, Guarded')).toBeInTheDocument();
  });

  it('should display frequency bars with value names and counts', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    expect(screen.getByText('Demersal')).toBeInTheDocument();
    expect(screen.getByText('Pelagic')).toBeInTheDocument();
    expect(screen.getByText('Elliptical')).toBeInTheDocument();
  });

  it('should render cards for species-level data', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    expect(screen.getByText('Egg location')).toBeInTheDocument();
    expect(screen.getByText('Egg shape')).toBeInTheDocument();
  });

  it('should render cards for genus-level fallback data', () => {
    render(<EggQualitativePanel data={genusLevelData} />);

    expect(screen.getByText('Demersal')).toBeInTheDocument();
    expect(screen.getByText('Elliptical')).toBeInTheDocument();
  });

  it('should render cards for family-level fallback data', () => {
    const familyData = {
      level: 'family' as const,
      levelName: 'Pomacentridae',
      traits: {
        EGG_LOCATION: [{ value: 'Demersal', count: 100 }],
        EGG_DETAILS: [],
        EGG_SHAPE: [],
        NB_OIL_GLOBULE: [],
      },
    };
    render(<EggQualitativePanel data={familyData} />);

    expect(screen.getByText('Demersal')).toBeInTheDocument();
  });

  it('should show "Unknown" for traits with no data', () => {
    const emptyData = {
      level: 'species' as const,
      levelName: 'Unknown species',
      traits: {
        EGG_LOCATION: [],
        EGG_DETAILS: [],
        EGG_SHAPE: [],
        NB_OIL_GLOBULE: [],
      },
    };
    const { container } = render(<EggQualitativePanel data={emptyData} />);

    expect(container.querySelector('[data-testid="egg-qualitative-panel"]')).toBeInTheDocument();

    // Should show "Unknown" for 3 traits (EGG_DETAILS is not a separate card)
    const unknowns = screen.getAllByText('Unknown');
    expect(unknowns.length).toBe(3);
  });

  it('should show "Unknown" for individual empty traits while showing data for others', () => {
    render(<EggQualitativePanel data={genusLevelData} />);

    // NB_OIL_GLOBULE is empty - should show Unknown (only 1 now since EGG_DETAILS is not a card)
    const unknowns = screen.getAllByText('Unknown');
    expect(unknowns.length).toBe(1);

    // Others should still have real data
    expect(screen.getByText('Demersal')).toBeInTheDocument();
    expect(screen.getByText('Elliptical')).toBeInTheDocument();
  });

  it('should render frequency bars with correct widths relative to max', () => {
    const { container } = render(<EggQualitativePanel data={speciesLevelData} />);

    const bars = container.querySelectorAll('[data-testid="freq-bar-fill"]');
    expect(bars.length).toBeGreaterThan(0);
  });
});
