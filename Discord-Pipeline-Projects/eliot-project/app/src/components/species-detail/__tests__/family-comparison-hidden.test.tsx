/**
 * Tests for US-8.4: Family comparison hidden when n_sp=1 and it's the current species.
 *
 * The family bar chart should:
 * - Show when there are 2+ species
 * - Show when there's 1 species that is NOT the current one (useful comparison)
 * - Hide when there's 1 species and it IS the current one (self-comparison is useless)
 * - Hide when there's no data
 */
import { render, screen } from '@testing-library/react';
import { TraitCard } from '../trait-card';

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Cell: () => <div />,
  CartesianGrid: () => <div />,
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => <div />,
  ChartTooltipContent: () => <div />,
}));

describe('US-8.4: Family comparison visibility rules', () => {
  const baseProps = {
    label: 'Settlement Age',
    mean: 25,
    sd: 3,
    min: 20,
    max: 30,
    unit: 'days',
    n: 5,
  };

  it('should show family chart when 2+ species present', () => {
    render(
      <TraitCard
        {...baseProps}
        currentSpeciesId="sp-a"
        familyChartData={[
          { speciesId: 'sp-a', speciesName: 'Species A', meanValue: 25 },
          { speciesId: 'sp-b', speciesName: 'Species B', meanValue: 30 },
        ]}
        familyChartComparisonType="family"
        familyChartTaxonomyName="TestFamily"
      />
    );
    // Chart should be rendered (2 species)
    expect(screen.getByText(/family comparison/i)).toBeTruthy();
  });

  it('should hide family chart when only 1 species and it IS the current species', () => {
    render(
      <TraitCard
        {...baseProps}
        currentSpeciesId="sp-a"
        familyChartData={[
          { speciesId: 'sp-a', speciesName: 'Species A', meanValue: 25 },
        ]}
        familyChartComparisonType="family"
        familyChartTaxonomyName="TestFamily"
      />
    );
    // Chart should NOT be rendered
    expect(screen.queryByText(/family comparison/i)).toBeNull();
  });

  it('should show family chart when only 1 species but it is NOT the current species', () => {
    render(
      <TraitCard
        {...baseProps}
        currentSpeciesId="sp-a"
        familyChartData={[
          { speciesId: 'sp-b', speciesName: 'Species B', meanValue: 30 },
        ]}
        familyChartComparisonType="family"
        familyChartTaxonomyName="TestFamily"
      />
    );
    // Chart SHOULD be rendered (different species, useful comparison)
    expect(screen.getByText(/family comparison/i)).toBeTruthy();
  });

  it('should hide family chart when no data', () => {
    render(
      <TraitCard
        {...baseProps}
        currentSpeciesId="sp-a"
        familyChartData={null}
      />
    );
    expect(screen.queryByText(/family comparison/i)).toBeNull();
  });
});
