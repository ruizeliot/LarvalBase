/**
 * Tests for US-2.3: Publication year & origin chart.
 *
 * Must show:
 * 1. Stacked bar chart by 5-year bins, colored by source category
 * 2. Legend identifying each source (Original/Cited × Reared/Wild/Unrecorded)
 * 3. Year bin labels on x-axis
 * 4. Variable selector to filter by trait
 * 5. "All dispersal traits" aggregate (sums per-variable unique counts)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublicationChart } from '../publication-chart';

/** Data without variable field (legacy format) */
const mockDataLegacy = [
  { year: 2000, source: 'Original\nReared', count: 5 },
  { year: 2000, source: 'Cited\nWild', count: 3 },
  { year: 2010, source: 'Original\nWild', count: 12 },
  { year: 2010, source: 'Cited\nReared', count: 8 },
  { year: 2020, source: 'Original\nUnrecorded', count: 20 },
];

/** Data with per-variable counts (new format matching R logic) */
const mockDataWithVariable = [
  // Larval growth rate
  { year: 2000, source: 'Original\nReared', count: 3, variable: 'Larval growth rate' },
  { year: 2000, source: 'Cited\nWild', count: 2, variable: 'Larval growth rate' },
  { year: 2010, source: 'Original\nWild', count: 7, variable: 'Larval growth rate' },
  // Egg diameter
  { year: 2000, source: 'Original\nReared', count: 2, variable: 'Egg diameter' },
  { year: 2010, source: 'Original\nWild', count: 5, variable: 'Egg diameter' },
  { year: 2010, source: 'Cited\nReared', count: 8, variable: 'Egg diameter' },
  { year: 2020, source: 'Original\nUnrecorded', count: 20, variable: 'Egg diameter' },
];

describe('US-2.3: Publication year & origin chart', () => {
  it('should render the chart title', () => {
    render(<PublicationChart data={mockDataLegacy} />);
    expect(screen.getByText('Number of references per 5-year interval')).toBeInTheDocument();
  });

  it('should render year labels', () => {
    render(<PublicationChart data={mockDataLegacy} />);
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('should render legend items for source categories', () => {
    render(<PublicationChart data={mockDataLegacy} />);
    expect(screen.getByText('Original - Reared')).toBeInTheDocument();
    expect(screen.getByText('Cited - Reared')).toBeInTheDocument();
    expect(screen.getByText('Original - Wild')).toBeInTheDocument();
    expect(screen.getByText('Cited - Wild')).toBeInTheDocument();
    expect(screen.getByText('Original - Unrecorded')).toBeInTheDocument();
  });

  it('should render nothing when data is empty', () => {
    const { container } = render(<PublicationChart data={[]} />);
    expect(container.querySelector('[data-testid="pub-chart"]')).toBeNull();
  });

  it('should show variable selector when data has variable field', () => {
    render(<PublicationChart data={mockDataWithVariable} />);
    const selector = screen.getByTestId('pub-chart-variable-select');
    expect(selector).toBeInTheDocument();
  });

  it('should default to "All dispersal traits" aggregate view', () => {
    render(<PublicationChart data={mockDataWithVariable} />);
    const selector = screen.getByTestId('pub-chart-variable-select') as HTMLSelectElement;
    expect(selector.value).toBe('All dispersal traits');
  });

  it('should aggregate per-variable counts for "All" view (sums across variables)', () => {
    render(<PublicationChart data={mockDataWithVariable} />);
    // Year 2000: Original\nReared = 3+2=5, Cited\nWild = 2 → total = 7
    // Year 2010: Original\nWild = 7+5=12, Cited\nReared = 8 → total = 20
    // Year 2020: Original\nUnrecorded = 20 → total = 20
    // All three years should appear
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('should filter data when a specific variable is selected', () => {
    render(<PublicationChart data={mockDataWithVariable} />);
    const selector = screen.getByTestId('pub-chart-variable-select');
    fireEvent.change(selector, { target: { value: 'Larval growth rate' } });
    // Larval growth rate has years 2000 and 2010 only (no 2020)
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.queryByText('2020')).toBeNull();
  });

  it('should render bar segments with non-zero height styles', () => {
    const { container } = render(<PublicationChart data={mockDataLegacy} />);
    // Each bar column should contain colored segments with positive height
    const barSegments = container.querySelectorAll('[data-testid="pub-chart-bar-segment"]');
    expect(barSegments.length).toBeGreaterThan(0);
    for (const seg of barSegments) {
      const height = (seg as HTMLElement).style.height;
      // Height should be a non-zero percentage
      expect(height).toMatch(/^\d+(\.\d+)?%$/);
      expect(parseFloat(height)).toBeGreaterThan(0);
    }
  });

  it('should render bar containers with non-zero height for bins with data', () => {
    const { container } = render(<PublicationChart data={mockDataLegacy} />);
    const barContainers = container.querySelectorAll('[data-testid="pub-chart-bar"]');
    expect(barContainers.length).toBe(3); // 3 year bins
    for (const bar of barContainers) {
      const height = (bar as HTMLElement).style.height;
      expect(parseFloat(height)).toBeGreaterThan(0);
    }
  });
});
