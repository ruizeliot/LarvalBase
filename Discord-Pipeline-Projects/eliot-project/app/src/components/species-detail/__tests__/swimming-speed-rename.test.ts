/**
 * Tests for US-8.2: Rename swimming speed panels to include '(Absolute)'.
 */
import { formatTraitName } from '@/lib/constants/trait-groups';

describe('US-8.2: Swimming speed panel names include (Absolute)', () => {
  it('should format critical_swimming_speed as "Critical Swimming Speed (Absolute)"', () => {
    expect(formatTraitName('critical_swimming_speed')).toBe('Critical Swimming Speed (Absolute)');
  });

  it('should format in_situ_swimming_speed as "In Situ Swimming Speed (Absolute)"', () => {
    expect(formatTraitName('in_situ_swimming_speed')).toBe('In Situ Swimming Speed (Absolute)');
  });

  it('should NOT add (Absolute) to relative swimming speed traits', () => {
    expect(formatTraitName('critical_swimming_speed_rel')).toBe('Critical Swimming Speed Rel');
    expect(formatTraitName('in_situ_swimming_speed_rel')).toBe('In Situ Swimming Speed Rel');
  });

  it('should still format other traits normally', () => {
    expect(formatTraitName('egg_diameter')).toBe('Egg Diameter');
    expect(formatTraitName('settlement_age')).toBe('Settlement Age');
  });
});
