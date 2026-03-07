/**
 * Tooltip definitions for section headers and panel-level items.
 * Definitions sourced from https://github.com/ruizeliot/fish_larvae_traits_db
 */

/** Section-level tooltip definitions (keyed by section title in DISPLAY_GROUPS) */
export const SECTION_TOOLTIPS: Record<string, string> = {
  'Egg & Incubation':
    'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
  'Hatching & Pre-flexion Stage':
    'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
  'Flexion Stage':
    'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
  'Metamorphosis':
    'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
  'Settlement':
    'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
  'Vertical Position':
    'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
  'Swimming Speed':
    'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
  'Pelagic Juvenile':
    'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
  'Rafting':
    'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
  'Larval Growth':
    'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
};

/** Trait-level tooltip definitions (keyed by trait key in DISPLAY_GROUPS) */
export const TRAIT_TOOLTIPS: Record<string, string> = {
  // Egg & Incubation
  egg_diameter:
    'Characteristics of the egg including its position in the water column, shape, size, and volume.',
  egg_width:
    'Width of non-spherical eggs (mm). Only shown when egg width differs from egg length.',
  egg_volume:
    'Volume of the egg in mm\u00B3, computed from diameter measurements. Spherical eggs use the formula (4/3)\u03C0r\u00B3.',
  yolk_diameter:
    'The nutrient-rich material inside the egg that nourishes the developing embryo until exogenous feeding begins. Size refers to the yolk diameter (in mm).',
  oil_globule_size:
    'A lipid-rich droplet inside the egg that provides energy reserves for developing embryos. Size refers to the diameter of the globule (in mm).',
  incubation_duration:
    'Duration of egg incubation or gestation (depending on reproduction mode), along with associated water temperature.',
  // Hatching & Pre-flexion
  hatching_size:
    'Size of larvae at hatching or parturition (depending on reproduction mode).',
  first_feeding_age:
    'Timing of first feeding (start of exogenous nutrition) and yolk-sac absorption (complete depletion of egg resources).',
  first_feeding_size:
    'Size of larvae at first feeding (start of exogenous nutrition) and yolk-sac absorption (complete depletion of egg resources).',
  yolk_absorption_age:
    'Timing of yolk-sac absorption \u2014 the complete depletion of egg resources.',
  yolk_absorbed_size:
    'Size of larvae at yolk-sac absorption (complete depletion of egg resources).',
  // Flexion
  flexion_age:
    'Timing of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements.',
  flexion_size:
    'Size of larvae at notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements.',
  // Metamorphosis
  metamorphosis_age:
    'Timing of metamorphosis \u2014 the transition from larval to juvenile stage.',
  metamorphosis_duration:
    'Duration of metamorphosis \u2014 the transition from larval to juvenile stage.',
  metamorphosis_size:
    'Size of larvae at metamorphosis \u2014 the transition from larval to juvenile stage.',
  // Settlement
  settlement_age:
    'Age at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
  settlement_size:
    'Size at which larvae transition from pelagic to benthic/demersal life (settlement).',
  // Swimming
  critical_swimming_speed:
    'Critical swimming speed (Ucrit) \u2014 the maximum sustained swimming velocity of larvae, measured in laboratory flume experiments with incrementally increasing water speeds.',
  critical_swimming_speed_rel:
    'Relative critical swimming speed (Ucrit) expressed in body lengths per second (BL/s).',
  in_situ_swimming_speed:
    'In situ swimming speed \u2014 swimming performance of larvae measured in the field using SCUBA-based protocols where divers follow individual larvae in open water.',
  in_situ_swimming_speed_rel:
    'Relative in situ swimming speed expressed in body lengths per second (BL/s).',
  // Vertical position
  vertical_day_depth:
    'Daytime depth position of larvae in the water column.',
  vertical_night_depth:
    'Nighttime depth position of larvae in the water column.',
  vertical_distribution:
    'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
};
