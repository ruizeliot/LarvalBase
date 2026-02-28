/**
 * Tests for US-4.1: Growth curve equations in legend with age-at-length info.
 *
 * Must:
 * 1. Show growth curve equation in monospace font in the legend
 * 2. Show age-at-length range (from xRange) per reference
 * 3. Continue showing reference name and temperature
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthLegendItem } from '../species-growth-chart';
import type { GrowthCurve } from '@/lib/types/growth.types';

function makeCurve(overrides: Partial<GrowthCurve['model']> = {}): GrowthCurve {
  return {
    id: 'test-curve-0',
    model: {
      speciesName: 'Chromis viridis',
      speciesId: 'chromis-viridis',
      xRange: '0 to 55',
      xUnit: 'dph',
      yType: 'SL',
      yUnit: 'mm',
      modelType: 'Linear',
      modelR2: 0.95,
      equation: 'L(t) = 28.5 × (1 − e^(−0.065 × (t − 2.1)))',
      param1: 28.5,
      param2: 0.065,
      param3: null,
      param4: null,
      tempMean: 28,
      tempMin: 26,
      tempMax: 30,
      remarks: null,
      reference: 'Ruiz et al. 2024',
      link: null,
      ...overrides,
    },
    points: [{ x: 0, y: 0 }, { x: 55, y: 25 }],
    lineStyle: 'solid',
    color: '#d73027',
  };
}

describe('US-4.1: Growth curve equations in legend', () => {
  it('should display the equation text in the legend', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} />);

    expect(screen.getByText('L(t) = 28.5 × (1 − e^(−0.065 × (t − 2.1)))')).toBeInTheDocument();
  });

  it('should display equation in monospace font style', () => {
    const curve = makeCurve();
    const { container } = render(<GrowthLegendItem curve={curve} />);

    const eqEl = container.querySelector('[data-testid="legend-equation"]');
    expect(eqEl).toBeInTheDocument();
    expect(eqEl?.className).toMatch(/font-mono/);
  });

  it('should display age-at-length range from xRange', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} />);

    // Should show "Age-at-length: 0 – 55 dph"
    expect(screen.getByText(/Age-at-length.*0.*55.*dph/)).toBeInTheDocument();
  });

  it('should still display reference name', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} />);

    expect(screen.getByText('Ruiz et al. 2024')).toBeInTheDocument();
  });

  it('should still display temperature info', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} />);

    expect(screen.getByText(/28\.0°C/)).toBeInTheDocument();
  });

  it('should handle null equation gracefully', () => {
    const curve = makeCurve({ equation: null });
    render(<GrowthLegendItem curve={curve} />);

    // Should still render without equation
    expect(screen.getByText('Ruiz et al. 2024')).toBeInTheDocument();
    expect(screen.queryByTestId('legend-equation')).not.toBeInTheDocument();
  });

  it('should handle missing xRange gracefully', () => {
    const curve = makeCurve({ xRange: '' });
    render(<GrowthLegendItem curve={curve} />);

    // No age-at-length line when xRange is empty
    expect(screen.queryByText(/Age-at-length/)).not.toBeInTheDocument();
  });
});
