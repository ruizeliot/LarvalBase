/**
 * Test that GrowthChartPanel does NOT display redundant "Length" / "Weight" title labels.
 * The y-axis label already shows this info (e.g., "Length (mm)", "Weight (mg)").
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Growth chart panel labels', () => {
  it('should NOT render the title prop as a visible label above the chart', () => {
    const filePath = path.resolve(__dirname, '../species-growth-chart.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The GrowthChartPanel function should not render {title} in a <p> tag
    expect(source).not.toMatch(/<p[^>]*>\{title\}<\/p>/);
  });
});
