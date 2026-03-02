/**
 * Tests for Epic 8: Active Behaviors restructuring.
 *
 * US-8.1: Vertical Distribution is the first trait in "Active Behaviors" section.
 * US-8.5: "Behavior & Ecology" section is removed entirely.
 */
import { DISPLAY_GROUPS, TRAIT_UNITS } from '../species-detail-config';
import { TRAIT_GROUPS } from '@/lib/constants/trait-groups';

describe('US-8.1: Vertical Distribution in Active Behaviors', () => {
  it('should have an "Active Behaviors" section in DISPLAY_GROUPS', () => {
    const activeBehaviors = DISPLAY_GROUPS.find(g => g.title === 'Active Behaviors');
    expect(activeBehaviors).toBeDefined();
  });

  it('should have vertical_distribution as the first trait in Active Behaviors', () => {
    const activeBehaviors = DISPLAY_GROUPS.find(g => g.title === 'Active Behaviors');
    expect(activeBehaviors).toBeDefined();
    expect(activeBehaviors!.traits[0]).toBe('vertical_distribution');
  });

  it('should include swimming speed traits after vertical_distribution', () => {
    const activeBehaviors = DISPLAY_GROUPS.find(g => g.title === 'Active Behaviors');
    expect(activeBehaviors).toBeDefined();
    expect(activeBehaviors!.traits).toContain('critical_swimming_speed');
    expect(activeBehaviors!.traits).toContain('in_situ_swimming_speed');
  });

  it('should have vertical_distribution in Active Behaviors filter group', () => {
    const activeBehaviors = TRAIT_GROUPS.find(g => g.name === 'Active Behaviors');
    expect(activeBehaviors).toBeDefined();
    expect(activeBehaviors!.traits).toContain('vertical_distribution');
  });

  it('should have TRAIT_UNITS entry for vertical_distribution', () => {
    expect(TRAIT_UNITS['vertical_distribution']).toBe('m depth');
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
