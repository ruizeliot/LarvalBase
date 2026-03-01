/**
 * Tests for Picture filter Sure/Unsure sub-filters.
 */
import { describe, it, expect } from 'vitest';
import { TRAIT_GROUPS, formatTraitName } from '../trait-groups';

describe('Pictures filter group', () => {
  it('should have Sure ID and Unsure ID sub-filters', () => {
    const picturesGroup = TRAIT_GROUPS.find((g) => g.name === 'Pictures');
    expect(picturesGroup).toBeDefined();
    expect(picturesGroup!.traits).toContain('has_images');
    expect(picturesGroup!.traits).toContain('has_images_sure');
    expect(picturesGroup!.traits).toContain('has_images_unsure');
  });

  it('should format Sure/Unsure trait names correctly', () => {
    expect(formatTraitName('has_images')).toBe('All');
    expect(formatTraitName('has_images_sure')).toBe('Sure ID');
    expect(formatTraitName('has_images_unsure')).toBe('Unsure ID');
  });
});
