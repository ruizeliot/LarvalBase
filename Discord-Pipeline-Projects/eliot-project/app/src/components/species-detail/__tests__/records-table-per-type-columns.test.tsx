/**
 * Test: Records table shows per-TYPE columns based on columns_per_type.txt.
 * Egg database records must NOT show Method, Origin, Temperature, Gear, Location, N.
 */
import { describe, it, expect } from 'vitest';
import { hasTraitSpecificColumns, getTraitColumns } from '../raw-data-modal';

describe('Records table per-TYPE columns', () => {
  it('egg_diameter should have trait-specific columns', () => {
    expect(hasTraitSpecificColumns('egg_diameter')).toBe(true);
  });

  it('egg_diameter columns should NOT include Method, Origin, Gear, Location, N', () => {
    const cols = getTraitColumns('egg_diameter');
    expect(cols).not.toBeNull();
    const keys = cols!.map(c => c.key);
    expect(keys).not.toContain('METHOD');
    expect(keys).not.toContain('ORIGIN');
    expect(keys).not.toContain('GEAR');
    expect(keys).not.toContain('LOCATION');
    expect(keys).not.toContain('N');
    expect(keys).not.toContain('TEMPERATURE_MEAN');
  });

  it('egg_diameter columns should include EGG_L_MEAN_TYPE and EGG_DIAMETER_CONF_TYPE', () => {
    const cols = getTraitColumns('egg_diameter');
    expect(cols).not.toBeNull();
    const keys = cols!.map(c => c.key);
    expect(keys).toContain('EGG_L_MEAN_TYPE');
    expect(keys).toContain('EGG_DIAMETER_CONF_TYPE');
  });

  it('incubation_duration should have temperature columns', () => {
    const cols = getTraitColumns('incubation_duration');
    expect(cols).not.toBeNull();
    const keys = cols!.map(c => c.key);
    expect(keys).toContain('INCUBATION_GESTATION_TEMPERATURE_MEAN');
  });

  it('all trait types should have trait-specific columns', () => {
    const allTraits = [
      'egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size',
      'incubation_duration', 'hatching_size', 'first_feeding_age',
      'first_feeding_size', 'yolk_absorption_age', 'yolk_absorbed_size',
      'flexion_age', 'flexion_size', 'metamorphosis_age', 'metamorphosis_duration',
      'metamorphosis_size', 'settlement_age', 'settlement_size',
      'vertical_distribution', 'critical_swimming_speed', 'critical_swimming_speed_rel',
      'in_situ_swimming_speed', 'in_situ_swimming_speed_rel',
      'pelagic_juvenile_size', 'pelagic_juvenile_duration',
      'rafting_size', 'rafting_behavior',
    ];

    for (const trait of allTraits) {
      expect(hasTraitSpecificColumns(trait)).toBe(true);
    }
  });

  it('settlement_age should have field-based columns per columns_per_type.txt', () => {
    const cols = getTraitColumns('settlement_age');
    expect(cols).not.toBeNull();
    const keys = cols!.map(c => c.key);
    expect(keys).toContain('LOCATION');
    expect(keys).toContain('COUNTRY');
    expect(keys).toContain('GEAR');
    expect(keys).toContain('N');
    expect(keys).toContain('SET_AGE_DPH_MEAN_TYPE');
  });
});
