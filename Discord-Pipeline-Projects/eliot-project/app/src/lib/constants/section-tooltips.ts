/**
 * Tooltip definitions for section headers and panel-level items.
 * Descriptions based on https://github.com/ruizeliot/fish_larvae_traits_db
 */

/** Section-level tooltip definitions (keyed by section title in DISPLAY_GROUPS) */
export const SECTION_TOOLTIPS: Record<string, string> = {
  'Egg & Incubation':
    'Egg characteristics: position in the water column, shape, dimensions, volume, yolk properties, and oil globule(s). Includes incubation/gestation duration and temperature.',
  'Hatching & Pre-flexion Stage':
    'Size of larvae at hatching or parturition, with associated rearing temperature.',
  'Flexion Stage':
    'Timing and size at notochord flexion \u2014 upward bending of the notochord during caudal fin ossification. A key larval developmental milestone.',
  'Metamorphosis':
    'Timing, duration, and size at metamorphosis \u2014 the larval-to-juvenile transition marked by scale appearance, fin development, and body proportion changes.',
  'Settlement':
    'Age and size at settlement \u2014 when pelagic larvae transition to benthic/demersal life, marking the end of pelagic larval duration (PLD).',
  'Vertical Position':
    'Larval position in the water column. Important for dispersal as different depths experience different current regimes.',
  'Swimming Speed':
    'Swimming performance measured in laboratory (critical speed, Ucrit) and in the field (in situ speed using SCUBA protocols).',
  'Pelagic Juvenile':
    'Possibility of extended pelagic phase after settlement in benthic/demersal fishes. Records size and age of wild pelagic juveniles sampled.',
  'Rafting':
    'Association of larvae/juveniles with floating objects (Sargassum, debris), which can significantly alter dispersal distance and direction.',
  'Larval Growth':
    'Individual age-length/weight measurements across the larval phase, used to estimate growth rates in relation to temperature.',
};

/** Trait-level tooltip definitions (keyed by trait key in DISPLAY_GROUPS) */
export const TRAIT_TOOLTIPS: Record<string, string> = {
  // Egg & Incubation
  egg_diameter:
    'Egg length (diameter for spherical eggs) in mm. Position in water column: pelagic (floating), benthic (attached to substrate), or brooded (mouth/pouch).',
  egg_width:
    'Width of non-spherical eggs in mm. Only shown when egg shape is non-spherical (width \u2260 length).',
  egg_volume:
    'Egg volume in mm\u00B3. Spherical: (4/3)\u03C0r\u00B3. Non-spherical: (4/3)\u03C0 \u00D7 (L/2) \u00D7 (W/2)\u00B2.',
  yolk_diameter:
    'Nutrient-rich material inside the egg nourishing the embryo until exogenous feeding. Size = yolk diameter in mm.',
  oil_globule_size:
    'Lipid-rich droplet(s) inside the egg providing energy reserves. Size = diameter in mm.',
  oil_globule_number:
    'Count or range of oil globule(s) in the egg. May change during development (e.g., multiple coalescing into one).',
  incubation_duration:
    'Duration of egg incubation or gestation (depending on reproduction mode), with associated water temperature.',
  // Hatching & Pre-flexion
  hatching_size:
    'Size of larvae at hatching or parturition, with associated rearing temperature.',
  first_feeding_age:
    'Timing (days post-hatch) at first exogenous feeding \u2014 when larvae start feeding from external sources.',
  first_feeding_size:
    'Size at first exogenous feeding and yolk-sac absorption.',
  yolk_absorption_age:
    'Timing of yolk-sac absorption \u2014 complete depletion of endogenous egg resources.',
  yolk_absorbed_size:
    'Size at yolk-sac absorption \u2014 complete depletion of endogenous egg resources.',
  // Flexion
  flexion_age:
    'Timing of notochord flexion \u2014 upward bending of the notochord during caudal fin ossification.',
  flexion_size:
    'Size at notochord flexion \u2014 upward bending of the notochord during caudal fin ossification.',
  // Metamorphosis
  metamorphosis_age:
    'Timing of metamorphosis \u2014 the larval-to-juvenile transition marked by scale appearance and fin development.',
  metamorphosis_duration:
    'Duration of metamorphosis \u2014 the transitional period from larval to juvenile morphology.',
  metamorphosis_size:
    'Size at metamorphosis \u2014 the larval-to-juvenile transition marked by scale appearance and fin development.',
  // Settlement
  settlement_age:
    'Age at settlement \u2014 when pelagic larvae transition to benthic/demersal life. Marks the end of pelagic larval duration (PLD).',
  settlement_size:
    'Size at settlement \u2014 when pelagic larvae transition to benthic/demersal life.',
  // Swimming
  critical_swimming_speed:
    'Critical swimming speed (Ucrit) \u2014 maximum sustained velocity measured in laboratory flume experiments with incrementally increasing flow.',
  critical_swimming_speed_rel:
    'Relative critical swimming speed (Ucrit) expressed in body lengths per second (BL/s).',
  in_situ_swimming_speed:
    'In situ swimming speed \u2014 field-measured performance using SCUBA protocols where divers follow individual larvae in open water.',
  in_situ_swimming_speed_rel:
    'Relative in situ swimming speed expressed in body lengths per second (BL/s).',
  // Vertical position
  vertical_day_depth:
    'Daytime depth of larvae in the water column.',
  vertical_night_depth:
    'Nighttime depth of larvae in the water column.',
  vertical_distribution:
    'Larval position in the water column. Important for dispersal as different depths experience different current regimes.',
};
