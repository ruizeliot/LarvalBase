/**
 * Tests for US-2.3: Publication year & origin chart.
 *
 * Must show:
 * 1. Stacked bar chart by 5-year bins, colored by source category
 * 2. Legend identifying each source (Original/Cited × Reared/Wild/Unrecorded)
 * 3. Year bin labels on x-axis
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicationChart } from '../publication-chart';

const mockData = [
  { year: 2000, source: 'Original\nReared', count: 5 },
  { year: 2000, source: 'Cited\nWild', count: 3 },
  { year: 2010, source: 'Original\nWild', count: 12 },
  { year: 2010, source: 'Cited\nReared', count: 8 },
  { year: 2020, source: 'Original\nUnrecorded', count: 20 },
];

describe('US-2.3: Publication year & origin chart', () => {
  it('should render the chart title', () => {
    render(<PublicationChart data={mockData} />);
    expect(screen.getByText('Number of references per 5-year interval')).toBeInTheDocument();
  });

  it('should render year labels', () => {
    render(<PublicationChart data={mockData} />);
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('should render legend items for source categories', () => {
    render(<PublicationChart data={mockData} />);
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
});
