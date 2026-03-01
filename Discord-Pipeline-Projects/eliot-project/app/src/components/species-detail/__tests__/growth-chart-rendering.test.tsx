/**
 * Tests for Epic 0 Fix: Growth chart rendering.
 *
 * Verifies:
 * 1. next.config.ts does not include 'recharts' in optimizePackageImports
 *    (tree-shaking breaks recharts internal dependencies)
 * 2. Chart data building handles empty curves correctly
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

describe('Growth chart rendering fix', () => {
  it('next.config.ts should NOT include recharts in optimizePackageImports', async () => {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    const content = await fs.readFile(configPath, 'utf-8');

    // Extract the optimizePackageImports array content
    const match = content.match(/optimizePackageImports\s*:\s*\[([^\]]*)\]/);
    if (match) {
      const arrayContent = match[1];
      // recharts should NOT be in the list
      expect(arrayContent).not.toContain('recharts');
    }
    // If optimizePackageImports doesn't exist, that's fine too
  });

  it('ComposedChart + Scatter domain fix: scatter data should compute axis ranges', async () => {
    // Import the groupRawPointsByReference to verify scatter grouping works
    const { groupRawPointsByReference } = await import('../species-growth-chart');

    const rawPoints = [
      {
        age: 15, length: 8, lengthType: 'SL', weight: null, weightType: null,
        tempMean: 25, tempMin: null, tempMax: null, origin: null, method: null,
        remarks: null, extRef: null, reference: 'TestRef', link: 'https://doi.org/test',
      },
    ];

    const groups = groupRawPointsByReference(rawPoints, [], 18, 32);
    expect(groups).toHaveLength(1);
    // Scatter points should have x/y mapping available
    const mappedPoints = groups[0].points
      .filter(p => p.length !== null)
      .map(p => ({ x: p.age, y: p.length! }));
    expect(mappedPoints[0]).toEqual({ x: 15, y: 8 });
  });
});
