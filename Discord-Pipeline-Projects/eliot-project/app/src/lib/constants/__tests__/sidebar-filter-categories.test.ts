/**
 * Tests for sidebar filter categories.
 */
import { describe, it, expect } from 'vitest';
import { TRAIT_GROUPS, formatTraitName } from '../trait-groups';

describe('sidebar filter categories', () => {
  it('should have rafting_age in Rafting group', () => {
    const rafting = TRAIT_GROUPS.find((g) => g.name === 'Rafting');
    expect(rafting?.traits).toContain('rafting_age');
  });

  it('should have pelagic_juvenile_behavior in Pelagic Juvenile group', () => {
    const pj = TRAIT_GROUPS.find((g) => g.name === 'Pelagic Juvenile');
    expect(pj?.traits).toContain('pelagic_juvenile_behavior');
  });

  it('should have depth traits but NOT vertical_day/vertical_night in Vertical Position group', () => {
    const vp = TRAIT_GROUPS.find((g) => g.name === 'Vertical Position');
    expect(vp?.traits).toContain('vertical_distribution');
    expect(vp?.traits).toContain('vertical_day_depth');
    expect(vp?.traits).toContain('vertical_night_depth');
    expect(vp?.traits).not.toContain('vertical_day');
    expect(vp?.traits).not.toContain('vertical_night');
  });

  it('should have egg_position, egg_shape, egg_oil_globules in Egg & Incubation group', () => {
    const egg = TRAIT_GROUPS.find((g) => g.name === 'Egg & Incubation');
    expect(egg?.traits).toContain('egg_position');
    expect(egg?.traits).toContain('egg_shape');
    expect(egg?.traits).toContain('egg_oil_globules');
  });

  it('should format new trait names correctly', () => {
    expect(formatTraitName('vertical_day')).toBe('Day');
    expect(formatTraitName('vertical_night')).toBe('Night');
    expect(formatTraitName('rafting_age')).toBe('Rafting Age');
    expect(formatTraitName('pelagic_juvenile_behavior')).toBe('Pelagic Juvenile Behavior');
    expect(formatTraitName('egg_position')).toBe('Egg Position');
    expect(formatTraitName('egg_shape')).toBe('Egg Shape');
    expect(formatTraitName('egg_oil_globules')).toBe('Oil Globules Number');
  });

  it('should rename Growth Curves to Larval Growth', () => {
    const names = TRAIT_GROUPS.map((g) => g.name);
    expect(names).toContain('Larval Growth');
    expect(names).not.toContain('Growth Curves');
  });

  it('should have correct sidebar order', () => {
    const names = TRAIT_GROUPS.map((g) => g.name);
    expect(names).toEqual([
      'Pictures',
      'Larval Growth',
      'Egg & Incubation',
      'Pre-flexion Stage',
      'Flexion Stage',
      'Metamorphosis',
      'Settlement',
      'Pelagic Juvenile',
      'Rafting',
      'Vertical Position',
      'Swimming Speed',
    ]);
  });

  it('should have PJ Behavior first in Pelagic Juvenile group', () => {
    const pj = TRAIT_GROUPS.find((g) => g.name === 'Pelagic Juvenile');
    expect(pj?.traits[0]).toBe('pelagic_juvenile_behavior');
  });

  it('should have Rafting Behavior first in Rafting group', () => {
    const rafting = TRAIT_GROUPS.find((g) => g.name === 'Rafting');
    expect(rafting?.traits[0]).toBe('rafting_behavior');
  });
});
