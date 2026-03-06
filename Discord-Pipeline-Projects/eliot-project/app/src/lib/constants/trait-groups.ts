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
    name: "Pictures",
    traits: [
      "has_images",
      "has_images_sure",
      "has_images_unsure",
    ],
  },
  {
    name: "Larval Growth",
    traits: [
      "larval_age_at_length",
      "growth_model",
    ],
  },
  {
    name: "Egg & Incubation",
    traits: [
      "egg_position",
      "egg_shape",
      "egg_diameter",
      "egg_width",
      "egg_volume",
      "yolk_diameter",
      "egg_oil_globules",
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
      "metamorphosis_duration",
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
    name: "Pelagic Juvenile",
    traits: [
      "pelagic_juvenile_behavior",
      "pelagic_juvenile_size",
      "pelagic_juvenile_duration",
    ],
  },
  {
    name: "Rafting",
    traits: [
      "rafting_behavior",
      "rafting_size",
      "rafting_age",
    ],
  },
  {
    name: "Vertical Position",
    traits: [
      "vertical_distribution",
      "vertical_day_depth",
      "vertical_night_depth",
    ],
  },
  {
    name: "Swimming Speed",
    traits: [
      "critical_swimming_speed",
      "critical_swimming_speed_rel",
      "in_situ_swimming_speed",
      "in_situ_swimming_speed_rel",
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
  if (trait === 'larval_age_at_length') return 'Age-at-length';
  if (trait === 'growth_model') return 'Growth model';
  if (trait === 'critical_swimming_speed') return 'Critical Swimming Speed (Absolute)';
  if (trait === 'critical_swimming_speed_rel') return 'Critical Swimming Speed (Relative)';
  if (trait === 'in_situ_swimming_speed') return 'In Situ Swimming Speed (Absolute)';
  if (trait === 'in_situ_swimming_speed_rel') return 'In Situ Swimming Speed (Relative)';
  if (trait === 'egg_diameter') return 'Egg Length';
  if (trait === 'egg_width') return 'Egg Width';
  if (trait === 'egg_position') return 'Egg Position';
  if (trait === 'egg_shape') return 'Egg Shape';
  if (trait === 'hatching_size') return 'Hatching/parturition Size';
  if (trait === 'incubation_duration') return 'Incubation/gestation Duration';
  if (trait === 'egg_oil_globules') return 'Oil Globules Number';
  if (trait === 'vertical_day') return 'Day';
  if (trait === 'vertical_night') return 'Night';
  if (trait === 'vertical_day_depth') return 'Daytime Depth';
  if (trait === 'vertical_night_depth') return 'Nighttime Depth';
  if (trait === 'vertical_distribution') return 'Overall Depth';
  if (trait === 'rafting_age') return 'Rafting Age';
  if (trait === 'pelagic_juvenile_behavior') return 'Pelagic Juvenile Behavior';
  return trait
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
