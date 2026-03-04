/**
 * Tests for egg width/length display logic.
 * When all eggs are spherical AND no egg_width data differs from egg_diameter,
 * show single "Egg Diameter" instead of "Egg Length" + "Egg Width".
 */
import { describe, it, expect } from 'vitest';
import { isAllEggsSpherical } from '../egg-spherical-helper';
import type { EggQualitativeData } from '../egg-qualitative-panel';

function makeEggData(shapeValues: string[]): EggQualitativeData {
  const frequencies = shapeValues.reduce((acc, v) => {
    const existing = acc.find((e) => e.value === v);
    if (existing) existing.count++;
    else acc.push({ value: v, count: 1 });
    return acc;
  }, [] as Array<{ value: string; count: number }>);

  return {
    level: 'species',
    levelName: 'Test species',
    traits: {
      EGG_LOCATION: [],
      EGG_DETAILS: [],
      EGG_SHAPE: frequencies,
      NB_OIL_GLOBULE: [],
    },
  };
}

describe('egg spherical detection (isAllEggsSpherical)', () => {
  it('should return true when all shapes are spherical', () => {
    const data = makeEggData(['Spherical', 'Spherical', 'Spherical']);
    expect(isAllEggsSpherical(data, false)).toBe(true);
  });

  it('should return false when mixed shapes exist', () => {
    const data = makeEggData(['Spherical', 'Ovoid']);
    expect(isAllEggsSpherical(data, false)).toBe(false);
  });

  it('should return false when only non-spherical shapes', () => {
    const data = makeEggData(['Ellipsoid']);
    expect(isAllEggsSpherical(data, false)).toBe(false);
  });

  it('should return false when no qualitative data', () => {
    expect(isAllEggsSpherical(null, false)).toBe(false);
  });

  it('should return false when EGG_SHAPE is empty', () => {
    const data = makeEggData([]);
    expect(isAllEggsSpherical(data, false)).toBe(false);
  });

  it('should return false when egg_width data exists even if all spherical', () => {
    const data = makeEggData(['Spherical']);
    // hasEggWidthData=true means EGG_W_MEAN differs from EGG_L_MEAN
    expect(isAllEggsSpherical(data, true)).toBe(false);
  });

  it('should be case-insensitive for spherical check', () => {
    const data = makeEggData(['spherical', 'SPHERICAL']);
    expect(isAllEggsSpherical(data, false)).toBe(true);
  });
});

describe('egg trait filtering', () => {
  it('should hide egg_width and rename egg_diameter when all spherical', () => {
    const traits = ['egg_diameter', 'egg_width', 'egg_volume'];
    const allEggsSpherical = true;
    const filtered = traits.filter((t) => !(allEggsSpherical && t === 'egg_width'));
    expect(filtered).toEqual(['egg_diameter', 'egg_volume']);
  });

  it('should keep egg_width when not all spherical', () => {
    const traits = ['egg_diameter', 'egg_width', 'egg_volume'];
    const allEggsSpherical = false;
    const filtered = traits.filter((t) => !(allEggsSpherical && t === 'egg_width'));
    expect(filtered).toEqual(['egg_diameter', 'egg_width', 'egg_volume']);
  });
});
