/**
 * Tests for US-1.6: Rename "Hatching & Early Development" to "Hatching & Pre-flexion Stage".
 *
 * Must verify:
 * 1. DISPLAY_GROUPS uses the new section name
 * 2. The old name "Hatching & Early Development" is no longer used
 * 3. The section icon mapping includes the new name
 */
import { describe, it, expect } from 'vitest';
import { DISPLAY_GROUPS } from '../species-detail-config';
import { SECTION_ICONS } from '@/lib/constants/section-icons';

describe('US-1.6: Section Rename', () => {
  it('should have "Hatching & Pre-flexion Stage" in DISPLAY_GROUPS', () => {
    const titles = DISPLAY_GROUPS.map((g) => g.title);
    expect(titles).toContain('Hatching & Pre-flexion Stage');
  });

  it('should NOT have "Hatching & Early Development" in DISPLAY_GROUPS', () => {
    const titles = DISPLAY_GROUPS.map((g) => g.title);
    expect(titles).not.toContain('Hatching & Early Development');
  });

  it('should have section icon for the new name', () => {
    expect(SECTION_ICONS['Hatching & Pre-flexion Stage']).toBeDefined();
  });

  it('should keep all expected sections', () => {
    const titles = DISPLAY_GROUPS.map((g) => g.title);
    expect(titles).toContain('Egg & Incubation');
    expect(titles).toContain('Hatching & Pre-flexion Stage');
    expect(titles).toContain('Flexion Stage');
    expect(titles).toContain('Metamorphosis');
    expect(titles).toContain('Settlement');
  });

  it('should keep hatching traits in the renamed section', () => {
    const hatchingGroup = DISPLAY_GROUPS.find(
      (g) => g.title === 'Hatching & Pre-flexion Stage'
    );
    expect(hatchingGroup).toBeDefined();
    expect(hatchingGroup!.traits).toContain('hatching_size');
    expect(hatchingGroup!.traits).toContain('first_feeding_age');
  });
});
