/**
 * Tests for egg width/length display logic.
 * When all eggs are spherical, show "Egg Diameter" instead of "Egg Length"
 * and hide "Egg Width" panel entirely.
 */
import { describe, it, expect } from 'vitest';

describe('egg width spherical logic', () => {
  it('should detect all-spherical eggs from frequency data', () => {
    const shapeData = [
      { category: 'Spherical', count: 15 },
    ];
    const allSpherical = shapeData.every(
      (e) => e.category.toLowerCase() === 'spherical'
    );
    expect(allSpherical).toBe(true);
  });

  it('should detect non-spherical eggs when mixed shapes exist', () => {
    const shapeData = [
      { category: 'Spherical', count: 10 },
      { category: 'Ovoid', count: 3 },
    ];
    const allSpherical = shapeData.every(
      (e) => e.category.toLowerCase() === 'spherical'
    );
    expect(allSpherical).toBe(false);
  });

  it('should not be spherical when only non-spherical shapes exist', () => {
    const shapeData = [
      { category: 'Ellipsoid', count: 5 },
    ];
    const allSpherical = shapeData.every(
      (e) => e.category.toLowerCase() === 'spherical'
    );
    expect(allSpherical).toBe(false);
  });

  it('should hide egg_width trait when all spherical', () => {
    const traits = ['egg_diameter', 'egg_width', 'egg_volume'];
    const allEggsSpherical = true;
    const filtered = traits.filter((t) => !(allEggsSpherical && t === 'egg_width'));
    expect(filtered).toEqual(['egg_diameter', 'egg_volume']);
    expect(filtered).not.toContain('egg_width');
  });

  it('should keep egg_width when not all spherical', () => {
    const traits = ['egg_diameter', 'egg_width', 'egg_volume'];
    const allEggsSpherical = false;
    const filtered = traits.filter((t) => !(allEggsSpherical && t === 'egg_width'));
    expect(filtered).toEqual(['egg_diameter', 'egg_width', 'egg_volume']);
  });
});
