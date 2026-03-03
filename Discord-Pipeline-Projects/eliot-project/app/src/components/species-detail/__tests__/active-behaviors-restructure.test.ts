/**
 * Tests for Epic 8/9: Section restructuring.
 *
 * Epic 9: "Active Behaviors" split into "Vertical Position" and "Swimming Speed".
 * US-8.5: "Behavior & Ecology" section is removed entirely.
 */
import { DISPLAY_GROUPS, TRAIT_UNITS } from '../species-detail-config';
import { TRAIT_GROUPS } from '@/lib/constants/trait-groups';

describe('Epic 9: Vertical Position as separate section', () => {
  it('should have a "Vertical Position" section in DISPLAY_GROUPS', () => {
    const vp = DISPLAY_GROUPS.find(g => g.title === 'Vertical Position');
    expect(vp).toBeDefined();
  });

  it('should have vertical_distribution in Vertical Position section', () => {
    const vp = DISPLAY_GROUPS.find(g => g.title === 'Vertical Position');
    expect(vp).toBeDefined();
    expect(vp!.traits).toContain('vertical_distribution');
  });

  it('should have a "Swimming Speed" section in DISPLAY_GROUPS', () => {
    const ss = DISPLAY_GROUPS.find(g => g.title === 'Swimming Speed');
    expect(ss).toBeDefined();
  });

  it('should include swimming speed traits in Swimming Speed section', () => {
    const ss = DISPLAY_GROUPS.find(g => g.title === 'Swimming Speed');
    expect(ss).toBeDefined();
    expect(ss!.traits).toContain('critical_swimming_speed');
    expect(ss!.traits).toContain('in_situ_swimming_speed');
  });

  it('should NOT have "Active Behaviors" in DISPLAY_GROUPS anymore', () => {
    const ab = DISPLAY_GROUPS.find(g => g.title === 'Active Behaviors');
    expect(ab).toBeUndefined();
  });

  it('should have vertical_distribution in Vertical Position filter group', () => {
    const vp = TRAIT_GROUPS.find(g => g.name === 'Vertical Position');
    expect(vp).toBeDefined();
    expect(vp!.traits).toContain('vertical_distribution');
  });

  it('should have Swimming Speed filter group', () => {
    const ss = TRAIT_GROUPS.find(g => g.name === 'Swimming Speed');
    expect(ss).toBeDefined();
    expect(ss!.traits).toContain('critical_swimming_speed');
  });

  it('should have TRAIT_UNITS entry for vertical_distribution', () => {
    expect(TRAIT_UNITS['vertical_distribution']).toBe('m');
  });
});

describe('US-8.5: Behavior & Ecology section removed', () => {
  it('should NOT have a "Behavior & Ecology" section in DISPLAY_GROUPS', () => {
    const behaviorEcology = DISPLAY_GROUPS.find(g => g.title === 'Behavior & Ecology');
    expect(behaviorEcology).toBeUndefined();
  });

  it('should NOT have a "Swimming Ability" section in DISPLAY_GROUPS', () => {
    const swimming = DISPLAY_GROUPS.find(g => g.title === 'Swimming Ability');
    expect(swimming).toBeUndefined();
  });

  it('should NOT have a "Behavior & Ecology" group in TRAIT_GROUPS', () => {
    const behaviorEcology = TRAIT_GROUPS.find(g => g.name === 'Behavior & Ecology');
    expect(behaviorEcology).toBeUndefined();
  });

  it('should NOT have a "Swimming Ability" group in TRAIT_GROUPS', () => {
    const swimming = TRAIT_GROUPS.find(g => g.name === 'Swimming Ability');
    expect(swimming).toBeUndefined();
  });
});
