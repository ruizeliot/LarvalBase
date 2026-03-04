/**
 * Test that GrowthChartPanel does NOT have a redundant "Length" / "Weight" title prop.
 * The y-axis label already shows this info (e.g., "Length (mm)", "Weight (mg)").
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Growth chart panel labels', () => {
  it('should NOT have a title prop on GrowthChartPanel', () => {
    const filePath = path.resolve(__dirname, '../species-growth-chart.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // GrowthChartPanel should not accept or render a title prop at all
    expect(source).not.toMatch(/title="Length"/);
    expect(source).not.toMatch(/title="Weight"/);
  });

  it('should NOT render {title} as a visible label above the chart', () => {
    const filePath = path.resolve(__dirname, '../species-growth-chart.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The GrowthChartPanel function should not render {title} in any heading tag
    expect(source).not.toMatch(/<p[^>]*>\{title\}<\/p>/);
    expect(source).not.toMatch(/<h[1-6][^>]*>\{title\}<\/h[1-6]>/);
  });
});
