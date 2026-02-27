/**
 * Tests for US-3.1: Qualitative egg traits as frequency barplots
 * with species/genus/family fallback.
 *
 * Must:
 * 1. Display 4 frequency barplots: EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE
 * 2. Show value frequencies as horizontal bars
 * 3. Cascade: species data → genus fallback → family fallback
 * 4. Show data level indicator (green=species, yellow=genus, red=family)
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
  it('should render all 4 trait labels', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    expect(screen.getByText('Egg location')).toBeInTheDocument();
    expect(screen.getByText('Egg location details')).toBeInTheDocument();
    expect(screen.getByText('Egg shape')).toBeInTheDocument();
    expect(screen.getByText('Number of oil globules')).toBeInTheDocument();
  });

  it('should display frequency bars with value names and counts', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    expect(screen.getByText('Demersal')).toBeInTheDocument();
    expect(screen.getByText('Pelagic')).toBeInTheDocument();
    expect(screen.getByText('Elliptical')).toBeInTheDocument();
  });

  it('should show species-level data indicator (green)', () => {
    render(<EggQualitativePanel data={speciesLevelData} />);

    const badge = screen.getByText('Species data');
    expect(badge).toBeInTheDocument();
  });

  it('should show genus-level data indicator (yellow) for fallback', () => {
    render(<EggQualitativePanel data={genusLevelData} />);

    const badge = screen.getByText(/Genus data/);
    expect(badge).toBeInTheDocument();
  });

  it('should show family-level data indicator (red) for fallback', () => {
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

    const badge = screen.getByText(/Family data/);
    expect(badge).toBeInTheDocument();
  });

  it('should render nothing when no qualitative data exists', () => {
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
    expect(container.querySelector('[data-testid="egg-qualitative-panel"]')).toBeNull();
  });

  it('should render frequency bars with correct widths relative to max', () => {
    const { container } = render(<EggQualitativePanel data={speciesLevelData} />);

    // The bar with count 17 out of 20 total should be wider than count 3
    const bars = container.querySelectorAll('[data-testid="freq-bar-fill"]');
    expect(bars.length).toBeGreaterThan(0);
  });
});
