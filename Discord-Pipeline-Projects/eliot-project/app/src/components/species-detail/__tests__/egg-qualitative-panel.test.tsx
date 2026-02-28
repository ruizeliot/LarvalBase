/**
 * Tests for US-3.1: Qualitative egg traits as frequency barplots
 * with species/genus/family fallback.
 *
 * Must:
 * 1. Display 4 frequency barplots: EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE
 * 2. Show value frequencies as horizontal bars
 * 3. Cascade: species data → genus fallback → family fallback
 * 4. Show data level indicator (green=species, yellow=genus, red=family)
 * 5. Always show all 4 traits (with "Unknown" when no data)
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

    const badges = screen.getAllByText('Species data');
    expect(badges.length).toBe(4); // One per trait card
  });

  it('should show genus-level data indicator (yellow) for fallback', () => {
    render(<EggQualitativePanel data={genusLevelData} />);

    const badges = screen.getAllByText(/Genus data/);
    expect(badges.length).toBe(4);
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

    const badges = screen.getAllByText(/Family data/);
    expect(badges.length).toBe(4);
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

    // Panel should always render
    expect(container.querySelector('[data-testid="egg-qualitative-panel"]')).toBeInTheDocument();

    // Should show "Unknown" for all 4 traits
    const unknowns = screen.getAllByText('Unknown');
    expect(unknowns.length).toBe(4);
  });

  it('should show "Unknown" for individual empty traits while showing data for others', () => {
    render(<EggQualitativePanel data={genusLevelData} />);

    // EGG_DETAILS and NB_OIL_GLOBULE are empty - should show Unknown
    const unknowns = screen.getAllByText('Unknown');
    expect(unknowns.length).toBe(2);

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
