/**
 * Tests for family-bar-chart depth domain logic.
 */
import { describe, it, expect } from 'vitest';

/**
 * Replicate the domain logic from FamilyBarChart:
 * - If all values are negative (depth traits), domain = [dataMin, 0] so 0 is on the right
 * - Otherwise domain = [0, dataMax]
 */
function computeXDomain(data: { meanValue: number }[]): [number | string, number | string] {
  const allNegative = data.length > 0 && data.every(d => d.meanValue < 0);
  if (allNegative) {
    return ['dataMin', 0];
  }
  return [0, 'dataMax'];
}

describe('FamilyBarChart X-axis domain', () => {
  it('should use [dataMin, 0] for negative (depth) values so 0 is on the right', () => {
    const depthData = [
      { meanValue: -28.7 },
      { meanValue: -13.1 },
      { meanValue: -5.2 },
    ];
    const domain = computeXDomain(depthData);
    expect(domain).toEqual(['dataMin', 0]);
  });

  it('should use [0, dataMax] for positive values', () => {
    const positiveData = [
      { meanValue: 10.5 },
      { meanValue: 25.3 },
    ];
    const domain = computeXDomain(positiveData);
    expect(domain).toEqual([0, 'dataMax']);
  });

  it('should use [0, dataMax] for mixed positive/negative values', () => {
    const mixedData = [
      { meanValue: -5.0 },
      { meanValue: 10.0 },
    ];
    const domain = computeXDomain(mixedData);
    expect(domain).toEqual([0, 'dataMax']);
  });
});
