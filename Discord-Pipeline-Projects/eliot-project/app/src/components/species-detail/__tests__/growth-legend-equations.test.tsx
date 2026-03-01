/**
 * Tests for growth curve legend: equation, temperature, reference hyperlinks, shape icons.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthLegendItem } from '../species-growth-chart';
import type { GrowthCurve, PointShapeType } from '@/lib/types/growth.types';

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

describe('Growth legend: equations + temperature + references', () => {
  it('should display equation and °C on the same info line', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    // Equation and temperature should be on the same span
    const infoLine = screen.getByText(/L\(t\).*28\.0°C/);
    expect(infoLine).toBeInTheDocument();
  });

  it('should display reference name', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    expect(screen.getByText('Ruiz et al. 2024')).toBeInTheDocument();
  });

  it('should display temperature info', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    expect(screen.getByText(/28\.0°C/)).toBeInTheDocument();
  });

  it('should NOT display age-at-length info in the legend', () => {
    const curve = makeCurve();
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    expect(screen.queryByText(/Age-at-length/)).not.toBeInTheDocument();
  });

  it('should handle null equation gracefully', () => {
    const curve = makeCurve({ equation: null });
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    expect(screen.getByText('Ruiz et al. 2024')).toBeInTheDocument();
  });

  it('should render reference as white text (not a link) even when link is provided', () => {
    const curve = makeCurve({ link: 'https://doi.org/10.1234/test' });
    const { container } = render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    // No <a> tags — links disabled, all references are white text
    const link = container.querySelector('a');
    expect(link).toBeNull();
    const ref = screen.getByText('Ruiz et al. 2024');
    expect(ref.className).toContain('text-white');
  });

  it('should render reference as white text when no link', () => {
    const curve = makeCurve({ link: null });
    const { container } = render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    const link = container.querySelector('a');
    expect(link).toBeNull();
    const ref = screen.getByText('Ruiz et al. 2024');
    expect(ref.className).toContain('text-white');
  });
});
