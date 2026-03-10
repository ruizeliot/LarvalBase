/**
 * Section icon mapping.
 *
 * Maps each data section name to its SVG icon path.
 * Uses existing stage SVGs from public/stages/ and adds
 * new icons for sections introduced in V2 (Pelagic Juvenile, Rafting, Active Behaviors).
 *
 * When section_icons.zip is provided by the researcher,
 * update paths to reference the new SVG files.
 */

/**
 * Section name → SVG icon path mapping.
 * Paths are relative to public/ directory (used by Next.js Image).
 */
export const SECTION_ICONS: Record<string, string> = {
  // Section SVGs from researcher (in /icons/sections/)
  'Egg & Incubation': '/icons/sections/Egg %26 Incubation.svg',
  'Pre-flexion Stage': '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  'Hatching & Pre-flexion Stage': '/icons/sections/Hatching %26 Pre-flexion Stage.svg', // Legacy alias
  'Hatching & Early Development': '/icons/sections/Hatching %26 Pre-flexion Stage.svg', // Legacy alias
  'Flexion Stage': '/icons/sections/Flexion Stage.svg',
  'Metamorphosis': '/icons/sections/Metamorphosis.svg',
  'Settlement': '/icons/sections/Settlement.svg',
  'Settlement-stage sampling locations': '/icons/sections/Settlement-stage%20sampling%20locations.svg',

  // Sections with dedicated SVGs
  'Active Behaviors': '/icons/sections/Active Behaviors.svg',
  'Swimming Speed': '/icons/Swimming speed.svg',
  'Vertical Position': '/icons/Vertical position.svg',
  'Pelagic Juvenile': '/icons/sections/Pelagic Juvenile.svg',
  'Rafting': '/icons/sections/Rafting.svg',
  'Age-at-Length': '/icons/sections/Age-at-Length.svg',
  'References': '/icons/References.svg',

  // Sections without dedicated SVGs — keep stage fallbacks
  'Swimming Ability': '/stages/post-flexion.svg',
  'Behavior & Ecology': '/stages/juvenile.svg',
  'Growth Curves': '/stages/flexion.svg',
  'Homepage': '/stages/egg.svg',
  'Photo Grid': '/stages/first-feeding.svg',
};

/**
 * Fallback icon when section is not mapped.
 */
const FALLBACK_ICON = '/stages/egg.svg';

/**
 * Get the SVG icon path for a section.
 *
 * @param sectionName - Display name of the section
 * @returns Path to SVG icon (relative to public/)
 */
export function getSectionIcon(sectionName: string): string {
  return SECTION_ICONS[sectionName] ?? FALLBACK_ICON;
}

/**
 * Get all section → icon mappings.
 */
export function getAllSectionIcons(): Array<{ section: string; icon: string }> {
  return Object.entries(SECTION_ICONS).map(([section, icon]) => ({
    section,
    icon,
  }));
}
