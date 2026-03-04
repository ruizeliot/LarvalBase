/**
 * Test that FamilyBarChart includes vertical grid lines (CartesianGrid).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('FamilyBarChart vertical grid lines', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../family-bar-chart.tsx'),
    'utf-8'
  );

  it('should import and render CartesianGrid for vertical grid lines', () => {
    expect(source).toContain('CartesianGrid');
    expect(source).toContain('vertical={true}');
  });

  it('should use a hardcoded light grey stroke color (not CSS variable)', () => {
    expect(source).toContain('stroke="#cccccc"');
    expect(source).not.toMatch(/CartesianGrid[\s\S]*?stroke="hsl\(var/);
  });

  it('should use inline style to force stroke color for CSS specificity', () => {
    // Inline style overrides shadcn ChartContainer CSS that may hide grid lines
    expect(source).toMatch(/style=\{?\{[^}]*stroke:\s*['"]#cccccc['"]/);
  });
});
