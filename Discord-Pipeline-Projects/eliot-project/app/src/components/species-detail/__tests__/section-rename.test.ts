/**
 * Tests for section rename: "Hatching & Pre-flexion Stage" -> "Pre-flexion Stage".
 *
 * Must verify:
 * 1. DISPLAY_GROUPS uses the new section name
 * 2. The old name is no longer used as a primary title
 * 3. The section icon mapping includes the new name
 */
import { describe, it, expect } from 'vitest';
import { DISPLAY_GROUPS } from '../species-detail-config';
import { SECTION_ICONS } from '@/lib/constants/section-icons';

describe('Section Rename: Pre-flexion Stage', () => {
  it('should have "Pre-flexion Stage" in DISPLAY_GROUPS', () => {
    const titles = DISPLAY_GROUPS.map((g) => g.title);
    expect(titles).toContain('Pre-flexion Stage');
  });

  it('should NOT have "Hatching & Pre-flexion Stage" as primary title in DISPLAY_GROUPS', () => {
    const titles = DISPLAY_GROUPS.map((g) => g.title);
    expect(titles).not.toContain('Hatching & Pre-flexion Stage');
  });

  it('should have section icon for the new name', () => {
    expect(SECTION_ICONS['Pre-flexion Stage']).toBeDefined();
  });

  it('should keep all expected sections', () => {
    const titles = DISPLAY_GROUPS.map((g) => g.title);
    expect(titles).toContain('Egg & Incubation');
    expect(titles).toContain('Pre-flexion Stage');
    expect(titles).toContain('Flexion Stage');
    expect(titles).toContain('Metamorphosis');
    expect(titles).toContain('Settlement');
  });

  it('should keep hatching traits in the renamed section', () => {
    const hatchingGroup = DISPLAY_GROUPS.find(
      (g) => g.title === 'Pre-flexion Stage'
    );
    expect(hatchingGroup).toBeDefined();
    expect(hatchingGroup!.traits).toContain('hatching_size');
    expect(hatchingGroup!.traits).toContain('first_feeding_age');
  });
});
