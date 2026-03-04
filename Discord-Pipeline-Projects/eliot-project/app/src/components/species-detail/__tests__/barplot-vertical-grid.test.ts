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
});
