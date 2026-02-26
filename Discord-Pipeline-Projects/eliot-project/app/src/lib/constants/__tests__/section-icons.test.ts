/**
 * Tests for US-1.5: SVG section icons mapped to all sections.
 *
 * Must verify:
 * 1. Every DISPLAY_GROUP section has an icon mapping
 * 2. Icon registry maps section names to SVG paths
 * 3. Fallback icon exists for unmapped sections
 * 4. Icons reference valid SVG files in public/
 */
import { describe, it, expect } from 'vitest';
import { SECTION_ICONS, getSectionIcon, getAllSectionIcons } from '../section-icons';

describe('US-1.5: SVG Section Icons', () => {
  it('should export a SECTION_ICONS mapping', () => {
    expect(SECTION_ICONS).toBeDefined();
    expect(typeof SECTION_ICONS).toBe('object');
  });

  it('should have icons for all main sections', () => {
    const requiredSections = [
      'Egg & Incubation',
      'Hatching & Pre-flexion Stage',
      'Flexion Stage',
      'Metamorphosis',
      'Settlement',
      'Swimming Ability',
      'Behavior & Ecology',
    ];

    for (const section of requiredSections) {
      expect(
        SECTION_ICONS[section],
        `Missing icon for section: ${section}`
      ).toBeDefined();
    }
  });

  it('should return SVG path for known section', () => {
    const icon = getSectionIcon('Egg & Incubation');
    expect(icon).toMatch(/\.svg$/);
  });

  it('should return fallback icon for unknown section', () => {
    const icon = getSectionIcon('Nonexistent Section');
    expect(icon).toBeDefined();
    expect(icon).toMatch(/\.svg$/);
  });

  it('should list all section icons', () => {
    const all = getAllSectionIcons();
    expect(all.length).toBeGreaterThan(5);
    for (const entry of all) {
      expect(entry.section).toBeDefined();
      expect(entry.icon).toMatch(/\.svg$/);
    }
  });

  it('should map new section names from PRD', () => {
    // New sections from PRD
    expect(SECTION_ICONS['Pelagic Juvenile']).toBeDefined();
    expect(SECTION_ICONS['Rafting']).toBeDefined();
    expect(SECTION_ICONS['Active Behaviors']).toBeDefined();
  });
});
