/**
 * Tests for Epic 0 Fix: Reference names in legend must be blue clickable links.
 *
 * All reference names should be blue. If a URL exists, they are clickable <a> tags.
 * If no URL, they are still styled blue for visual consistency.
 * Scatter-only legend: only ref name is blue, "no fitted model" is muted.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthLegendItem, ScatterOnlyLegendItem } from '../species-growth-chart';
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
      equation: null,
      param1: 2,
      param2: 0.5,
      param3: null,
      param4: null,
      tempMean: 25,
      tempMin: null,
      tempMax: null,
      remarks: null,
      reference: 'Smith et al. 2024',
      link: null,
      ...overrides,
    },
    points: [{ x: 0, y: 2 }],
    lineStyle: 'solid',
    color: '#d73027',
  };
}

describe('Growth legend: reference names always blue', () => {
  it('reference with link should be a blue <a> tag', () => {
    const curve = makeCurve({ link: 'https://doi.org/10.1234/test' });
    const { container } = render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.className).toContain('text-blue');
    expect(link?.href).toContain('doi.org');
  });

  it('reference WITHOUT link should still be blue text', () => {
    const curve = makeCurve({ link: null });
    const { container } = render(<GrowthLegendItem curve={curve} refIndex={0} shape="circle" />);

    const refElement = screen.getByText('Smith et al. 2024');
    expect(refElement).toBeInTheDocument();
    // Must be blue, not plain foreground color
    expect(refElement.className).toContain('text-blue');
  });
});

describe('Scatter-only legend: ref name displayed, no "no fitted model" text', () => {
  it('ref name with link should be an <a> tag, no "no fitted model" text anywhere', () => {
    const { container } = render(
      <ScatterOnlyLegendItem
        reference="Jones et al. 2023"
        link="https://doi.org/10.5678/test"
        color="#d73027"
        shape="circle"
        avgTemp={25}
        lengthType={null}
      />
    );

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.textContent).toBe('Jones et al. 2023');

    // "no fitted model" should NOT appear anywhere in the legend item
    expect(container.textContent).not.toContain('no fitted model');
  });

  it('ref name without link should be a span, no "no fitted model" text', () => {
    const { container } = render(
      <ScatterOnlyLegendItem
        reference="Doe et al. 2022"
        link={null}
        color="#d73027"
        shape="square"
        avgTemp={null}
        lengthType={null}
      />
    );

    const refElement = screen.getByText('Doe et al. 2022');
    expect(refElement).toBeInTheDocument();
    expect(container.textContent).not.toContain('no fitted model');
  });

  it('individual scatter legend entries should NOT contain "Scatter points only"', () => {
    const { container } = render(
      <ScatterOnlyLegendItem
        reference="Smith et al. 2024"
        link={null}
        color="#d73027"
        shape="circle"
        avgTemp={25}
        lengthType="SL"
      />
    );

    // The text "Scatter points only" should NOT appear in individual legend items
    expect(container.textContent).not.toContain('Scatter points only');
  });

  it('should display LENGTH_TYPE in scatter-only legend when available', () => {
    render(
      <ScatterOnlyLegendItem
        reference="Smith et al. 2024"
        link={null}
        color="#d73027"
        shape="circle"
        avgTemp={25}
        lengthType="SL"
      />
    );

    // Should show "SL · 25.0°C" in metadata line
    expect(screen.getByText(/SL/)).toBeInTheDocument();
  });
});
