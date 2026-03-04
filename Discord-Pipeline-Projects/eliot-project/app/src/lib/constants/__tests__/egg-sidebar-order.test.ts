/**
 * Tests for Fix 2: Egg & Incubation sidebar ordering.
 * - Egg Position and Egg Shape should be FIRST
 * - Oil Globules Number should be ABOVE Oil Globule Size
 */
import { describe, it, expect } from 'vitest';
import { TRAIT_GROUPS } from '../trait-groups';

describe('Egg & Incubation sidebar order', () => {
  it('should have egg_position and egg_shape as first two traits', () => {
    const egg = TRAIT_GROUPS.find((g) => g.name === 'Egg & Incubation');
    expect(egg).toBeDefined();
    expect(egg?.traits[0]).toBe('egg_position');
    expect(egg?.traits[1]).toBe('egg_shape');
  });

  it('should have egg_oil_globules before oil_globule_size', () => {
    const egg = TRAIT_GROUPS.find((g) => g.name === 'Egg & Incubation');
    expect(egg).toBeDefined();
    const oilGlobulesIdx = egg!.traits.indexOf('egg_oil_globules');
    const oilSizeIdx = egg!.traits.indexOf('oil_globule_size');
    expect(oilGlobulesIdx).toBeGreaterThan(-1);
    expect(oilSizeIdx).toBeGreaterThan(-1);
    expect(oilGlobulesIdx).toBeLessThan(oilSizeIdx);
  });
});
