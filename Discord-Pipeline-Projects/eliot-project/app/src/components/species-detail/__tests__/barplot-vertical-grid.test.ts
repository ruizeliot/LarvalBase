/**
 * Test that FamilyBarChart includes vertical grid lines (CartesianGrid).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('FamilyBarChart vertical grid lines', () => {
  it('should import and render CartesianGrid for vertical grid lines', () => {
    const filePath = path.resolve(__dirname, '../family-bar-chart.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');
    // Must import CartesianGrid from recharts
    expect(source).toContain('CartesianGrid');
    // Must use vertical={true} or vertical lines configuration
    expect(source).toMatch(/vertical/i);
  });

  it('should use a hardcoded light grey stroke color (not CSS variable)', () => {
    const filePath = path.resolve(__dirname, '../family-bar-chart.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');
    // CSS variables like hsl(var(--border)) may not resolve in SVG attributes
    // Use a hardcoded light grey color instead
    expect(source).toContain('stroke="#cccccc"');
    expect(source).not.toMatch(/CartesianGrid[\s\S]*?stroke="hsl\(var/);
  });
});
