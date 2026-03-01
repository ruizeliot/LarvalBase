/**
 * Trait grouping for filter UI.
 * Groups match the species detail page sections (species-detail-config.ts).
 * Plus a special "Pictures" group for image availability filtering.
 */

export interface TraitGroup {
  name: string;
  traits: string[];
}

/**
 * Trait groups matching species detail page sections.
 * Order matches DISPLAY_GROUPS in species-detail-config.ts.
 */
export const TRAIT_GROUPS: TraitGroup[] = [
  {
    name: "Egg & Incubation",
    traits: [
      "egg_diameter",
      "egg_volume",
      "yolk_diameter",
      "oil_globule_size",
      "incubation_duration",
    ],
  },
  {
    name: "Hatching & Pre-flexion Stage",
    traits: [
      "hatching_size",
      "first_feeding_age",
      "first_feeding_size",
      "yolk_absorption_age",
      "yolk_absorbed_size",
    ],
  },
  {
    name: "Flexion Stage",
    traits: [
      "flexion_age",
      "flexion_size",
    ],
  },
  {
    name: "Metamorphosis",
    traits: [
      "metamorphosis_age",
      "metamorphosis_size",
    ],
  },
  {
    name: "Settlement",
    traits: [
      "settlement_age",
      "settlement_size",
    ],
  },
  {
    name: "Growth Curves",
    traits: [
      "larval_length",
      "larval_age",
    ],
  },
  {
    name: "Swimming Ability",
    traits: [
      "critical_swimming_speed",
      "critical_swimming_speed_rel",
      "in_situ_swimming_speed",
      "in_situ_swimming_speed_rel",
    ],
  },
  {
    name: "Behavior & Ecology",
    traits: [
      "vertical_distribution",
      "rafting_behavior",
      "rafting_size",
      "pelagic_juvenile_size",
    ],
  },
  {
    name: "Pictures",
    traits: [
      "has_images",
      "has_images_sure",
      "has_images_unsure",
    ],
  },
];

/**
 * Get all trait names from all groups.
 */
export function getAllTraits(): string[] {
  return TRAIT_GROUPS.flatMap((group) => group.traits);
}

/**
 * Format trait name for display.
 * Converts snake_case to Title Case with special cases.
 */
export function formatTraitName(trait: string): string {
  if (trait === 'has_images') return 'All';
  if (trait === 'has_images_sure') return 'Sure ID';
  if (trait === 'has_images_unsure') return 'Unsure ID';
  return trait
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
