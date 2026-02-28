/**
 * Tests for US-4.4: Data points without modelled curve colored by reference + temperature.
 *
 * Must:
 * 1. Raw points grouped by reference
 * 2. Each reference group gets Spectral color based on temperature
 * 3. References without a fitted model show as open circles (stroke only)
 * 4. References with a model show filled circles matching model color
 * 5. Legend entry for scatter-only references shows "no fitted model"
 */
import { describe, it, expect } from 'vitest';
import { groupRawPointsByReference } from '../species-growth-chart';
import type { RawGrowthPoint, GrowthCurve } from '@/lib/types/growth.types';

function makeRawPoint(overrides: Partial<RawGrowthPoint> = {}): RawGrowthPoint {
  return {
    age: 10,
    length: 5,
    lengthType: 'SL',
    tempMean: 25,
    reference: 'Ruiz 2024',
    ...overrides,
  };
}

describe('US-4.4: Scatter points colored by reference + temperature', () => {
  it('should group raw points by reference', () => {
    const points: RawGrowthPoint[] = [
      makeRawPoint({ reference: 'Ref A', age: 5, length: 3 }),
      makeRawPoint({ reference: 'Ref A', age: 10, length: 8 }),
      makeRawPoint({ reference: 'Ref B', age: 7, length: 4 }),
    ];

    const groups = groupRawPointsByReference(points, []);
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.reference === 'Ref A')?.points).toHaveLength(2);
    expect(groups.find(g => g.reference === 'Ref B')?.points).toHaveLength(1);
  });

  it('should assign Spectral color based on average temperature of group', () => {
    const points: RawGrowthPoint[] = [
      makeRawPoint({ reference: 'Hot Ref', tempMean: 30 }),
      makeRawPoint({ reference: 'Cold Ref', tempMean: 19 }),
    ];

    const groups = groupRawPointsByReference(points, []);
    const hotGroup = groups.find(g => g.reference === 'Hot Ref');
    const coldGroup = groups.find(g => g.reference === 'Cold Ref');

    // Hot should be reddish, cold should be bluish
    const hotR = parseInt(hotGroup!.color.slice(1, 3), 16);
    const coldB = parseInt(coldGroup!.color.slice(5, 7), 16);
    expect(hotR).toBeGreaterThan(150);
    expect(coldB).toBeGreaterThan(100);
  });

  it('should mark groups as hasModel=false when reference has no curve', () => {
    const points: RawGrowthPoint[] = [
      makeRawPoint({ reference: 'No Model Ref', tempMean: 25 }),
    ];

    const groups = groupRawPointsByReference(points, []);
    expect(groups[0].hasModel).toBe(false);
  });

  it('should mark groups as hasModel=true when reference matches a curve', () => {
    const points: RawGrowthPoint[] = [
      makeRawPoint({ reference: 'Ruiz 2024', tempMean: 28 }),
    ];
    const curves: GrowthCurve[] = [
      {
        id: 'c-0',
        model: {
          speciesName: 'Test',
          speciesId: 'test',
          xRange: '0 to 50',
          xUnit: 'dph',
          yType: 'SL',
          yUnit: 'mm',
          modelType: 'Linear',
          modelR2: 0.9,
          equation: null,
          param1: 1,
          param2: 0.5,
          param3: null,
          param4: null,
          tempMean: 28,
          tempMin: null,
          tempMax: null,
          remarks: null,
          reference: 'Ruiz 2024',
          link: null,
        },
        points: [],
        lineStyle: 'solid',
        color: '#d73027',
      },
    ];

    const groups = groupRawPointsByReference(points, curves);
    expect(groups[0].hasModel).toBe(true);
  });

  it('should handle null references by grouping them as "Unknown"', () => {
    const points: RawGrowthPoint[] = [
      makeRawPoint({ reference: null }),
    ];

    const groups = groupRawPointsByReference(points, []);
    expect(groups[0].reference).toBe('Unknown');
  });

  it('should use neutral gray for null temperature', () => {
    const points: RawGrowthPoint[] = [
      makeRawPoint({ reference: 'No Temp Ref', tempMean: null }),
    ];

    const groups = groupRawPointsByReference(points, []);
    expect(groups[0].color).toBe('#6b7280');
  });
});
