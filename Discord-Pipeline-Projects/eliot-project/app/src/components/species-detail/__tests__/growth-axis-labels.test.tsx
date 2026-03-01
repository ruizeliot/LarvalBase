/**
 * Tests for Epic 0 Fix: Move LENGTH_TYPE/WEIGHT_TYPE from y-axis to legend.
 *
 * Y-axis should show generic "Length (mm)" or "Weight (mg)", NOT "SL (mm)" or "DW (mg)".
 * The specific type (SL, TL, DW, WW) belongs in the legend alongside each reference.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthLegendItem } from '../species-growth-chart';
import type { GrowthCurve } from '@/lib/types/growth.types';

function makeCurve(overrides: Partial<GrowthCurve['model']> = {}): GrowthCurve {
  return {
    id: 'test-curve-0',
    model: {
      speciesName: 'Test fish',
      speciesId: 'test-fish',
      xRange: '0 to 50',
      xUnit: 'dph',
      yType: 'SL',
      yUnit: 'mm',
      modelType: 'Linear',
      modelR2: 0.95,
      equation: 'Y = 2 + 0.5*X',
      param1: 2,
      param2: 0.5,
      param3: null,
      param4: null,
      tempMean: 25,
      tempMin: null,
      tempMax: null,
      remarks: null,
      reference: 'Smith 2024',
      link: null,
      ...overrides,
    },
    points: [{ x: 0, y: 2 }, { x: 50, y: 27 }],
    lineStyle: 'solid',
    color: '#d73027',
  };
}

describe('Growth axis label fix: type info in legend not y-axis', () => {
  it('legend should include LENGTH_TYPE (e.g. SL) in the info line', () => {
    const curve = makeCurve({ yType: 'SL', yUnit: 'mm' });
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    // The type info "SL" should appear in the legend
    const infoText = screen.getByText(/SL/);
    expect(infoText).toBeInTheDocument();
  });

  it('legend should include WEIGHT_TYPE (e.g. DW) for weight curves', () => {
    const curve = makeCurve({ yType: 'DW', yUnit: 'mg' });
    render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    const infoText = screen.getByText(/DW/);
    expect(infoText).toBeInTheDocument();
  });
});
