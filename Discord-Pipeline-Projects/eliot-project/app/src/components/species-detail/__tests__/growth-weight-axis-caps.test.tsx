/**
 * Tests for Epic 0 Fix: Weight chart axis caps.
 *
 * 1. Weight Y-axis should be capped at max raw weight data value
 * 2. Weight X-axis should share the same xMax from met/set databases
 */
import { describe, it, expect } from 'vitest';
import { computeWeightAxisCaps } from '../species-growth-chart';
import type { RawGrowthPoint } from '@/lib/types/growth.types';
import type { GrowthCurve } from '@/lib/types/growth.types';

function makeRawPoint(overrides: Partial<RawGrowthPoint> = {}): RawGrowthPoint {
  return {
    age: 10,
    length: 5,
    lengthType: 'SL',
    weight: null,
    weightType: null,
    tempMean: 25,
    tempMin: null,
    tempMax: null,
    origin: null,
    method: null,
    remarks: null,
    extRef: null,
    reference: 'TestRef',
    link: null,
    ...overrides,
  };
}

function makeWeightCurve(maxY: number): GrowthCurve {
  return {
    id: 'weight-curve-0',
    model: {
      speciesName: 'Test fish',
      speciesId: 'test-fish',
      xRange: '0 to 50',
      xUnit: 'dph',
      yType: 'DW',
      yUnit: 'mg',
      modelType: 'Linear',
      modelR2: 0.95,
      equation: null,
      param1: 0,
      param2: 1,
      param3: null,
      param4: null,
      tempMean: 25,
      tempMin: null,
      tempMax: null,
      remarks: null,
      reference: 'TestRef',
      link: null,
    },
    points: [{ x: 0, y: 0 }, { x: 50, y: maxY }],
    lineStyle: 'solid',
    color: '#d73027',
  };
}

describe('Weight chart axis caps', () => {
  it('should cap weight Y-axis at max raw weight value * 1.05', () => {
    const rawPoints = [
      makeRawPoint({ weight: 0.5 }),
      makeRawPoint({ weight: 2.3 }),
      makeRawPoint({ weight: 1.8 }),
    ];

    const caps = computeWeightAxisCaps(rawPoints, [], 100);
    // yMax should be max of weight values (2.3) * 1.05
    expect(caps.yMax).toBeCloseTo(2.3 * 1.05, 1);
  });

  it('should use xMax from met/set databases (passed in)', () => {
    const rawPoints = [makeRawPoint({ weight: 1.0 })];
    const caps = computeWeightAxisCaps(rawPoints, [], 80);
    expect(caps.xMax).toBe(80);
  });

  it('should consider weight curve points for yMax', () => {
    const weightCurves = [makeWeightCurve(5.0)];
    const caps = computeWeightAxisCaps([], weightCurves, 100);
    expect(caps.yMax).toBeCloseTo(5.0 * 1.05, 1);
  });

  it('should use the larger of raw weight and curve weight for yMax', () => {
    const rawPoints = [makeRawPoint({ weight: 3.0 })];
    const weightCurves = [makeWeightCurve(5.0)];
    const caps = computeWeightAxisCaps(rawPoints, weightCurves, 100);
    expect(caps.yMax).toBeCloseTo(5.0 * 1.05, 1);
  });

  it('should return null yMax when no weight data', () => {
    const caps = computeWeightAxisCaps([], [], 100);
    expect(caps.yMax).toBeNull();
  });

  it('should pass xMax=null when no met/set cap', () => {
    const rawPoints = [makeRawPoint({ weight: 1.0 })];
    const caps = computeWeightAxisCaps(rawPoints, [], null);
    expect(caps.xMax).toBeNull();
  });
});
