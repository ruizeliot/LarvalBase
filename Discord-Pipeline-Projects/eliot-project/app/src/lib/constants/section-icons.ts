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
  // Existing sections — mapped to stage SVGs
  'Egg & Incubation': '/stages/egg.svg',
  'Hatching & Pre-flexion Stage': '/stages/yolk-sac.svg',
  'Hatching & Early Development': '/stages/yolk-sac.svg', // Legacy name alias
  'Flexion Stage': '/stages/flexion.svg',
  'Metamorphosis': '/stages/metamorphosis.svg',
  'Settlement': '/stages/settlement.svg',

  // Existing sections — swimming/behavior
  'Swimming Ability': '/stages/post-flexion.svg',
  'Behavior & Ecology': '/stages/juvenile.svg',

  // New V2 sections (PRD)
  'Active Behaviors': '/stages/post-flexion.svg',
  'Pelagic Juvenile': '/stages/juvenile.svg',
  'Rafting': '/stages/settlement.svg',

  // Growth curves
  'Growth Curves': '/stages/flexion.svg',

  // Homepage sections
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
