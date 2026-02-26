/**
 * Tests for US-2.3: Publication year & origin chart.
 *
 * Must show:
 * 1. Bar chart by year, colored by data source
 * 2. Legend identifying each data source color
 * 3. Year labels on x-axis
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicationChart } from '../publication-chart';

const mockData = [
  { year: 2000, source: 'Literature', count: 5 },
  { year: 2000, source: 'Field studies', count: 3 },
  { year: 2010, source: 'Literature', count: 12 },
  { year: 2010, source: 'FishBase', count: 8 },
  { year: 2020, source: 'Ruiz et al.', count: 20 },
];

describe('US-2.3: Publication year & origin chart', () => {
  it('should render the chart title', () => {
    render(<PublicationChart data={mockData} />);
    expect(screen.getByText('Publications by Year & Data Source')).toBeInTheDocument();
  });

  it('should render year labels', () => {
    render(<PublicationChart data={mockData} />);
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('should render legend items for data sources', () => {
    render(<PublicationChart data={mockData} />);
    expect(screen.getByText('Literature')).toBeInTheDocument();
    expect(screen.getByText('Field studies')).toBeInTheDocument();
    expect(screen.getByText('FishBase')).toBeInTheDocument();
    expect(screen.getByText('Ruiz et al.')).toBeInTheDocument();
  });

  it('should render nothing when data is empty', () => {
    const { container } = render(<PublicationChart data={[]} />);
    expect(container.querySelector('[data-testid="pub-chart"]')).toBeNull();
  });
});
