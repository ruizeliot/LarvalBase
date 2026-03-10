/**
 * Tooltip definitions for section headers and panel-level items.
 * Descriptions based on https://github.com/ruizeliot/fish_larvae_traits_db
 */

/** Section-level tooltip definitions (keyed by section title in DISPLAY_GROUPS) */
export const SECTION_TOOLTIPS: Record<string, string> = {
  'Egg & Incubation':
    'Embryo development location and characteristics of eggs (if any), including position in the water column, shape, dimensions, volume, yolk properties, and oil globule(s). Includes incubation/gestation duration and temperature.',
  'Pre-flexion Stage':
    'Size of larvae at hatching (egg-based reproduction) or parturition, with associated rearing temperature.',
  'Hatching & Pre-flexion Stage':
    'Size of larvae at hatching (egg-based reproduction) or parturition, with associated rearing temperature.',
  'Flexion Stage':
    'Timing and size of notochord (embryonic vertebrate column) flexion. The upward bending of the notochord is associated with the ossification of caudal fin elements that allows efficient swimming, which marks the transition from the pre-flexion to post-flexion stage.',
  'Metamorphosis':
    'Timing, duration, and size at morphological metamorphosis: the transition from larval to juvenile stage. This process largely varies among fish families, but is often characterized by the appearance of scales, the growth of all fin spines/rays to reach the adult count, the acquisition of juvenile coloration, and/or the loss of specialized larval attributes.',
  'Settlement':
    'This database specific to benthic fishes (living near the bottom) provides the age and size at settlement on a substrate, which marks the transition from a pelagic (offshore) to a benthic lifestyle. It is often confused with the term \'recruitment\' (wrongly applied, as it defines the entrance of juveniles in the adult stock), and the term \'PLD\' (Pelagic Larval Duration), that suppose morphological metamorphosis and settlement occur simultaneously, which is not necessarily the case (see Pelagic juvenile and Rafting sections).',
  'Vertical Position':
    'Vertical distribution of fish larvae (genus and family-level identifications also taken into account) in the first 100m of the water column (standardized by sampling effort), as different depths experience different current regimes.',
  'Swimming Speed':
    'Critical swimming speed (Ucrit) and In-situ Swimming Speed (ISS) at or near the settlement stage of benthic/demersal fishes. Ucrit corresponds to forced laboratory measurements of short-term maximum speed in a swimming flume with incrementally increasing flow. ISS corresponds to in situ measurements of routine speed while scuba diving to follow larvae in the wild.',
  'Pelagic Juvenile':
    'Possibility of extended pelagic phase after settlement in benthic/demersal fishes. Species-level records of the age and size of wild pelagic juveniles sampled pelagic juveniles.',
  'Rafting':
    'Associations with floating objects or organisms in the pelagic environment, which could largely increase the dispersal potential of rafters. Species-level and genus-level records of the age and size of sampled rafters.',
  'Larval Growth':
    'Individual age-length/weight measurements across the larval phase, used to estimate growth rates in relation to temperature.',
};

/** Panel-level tooltip definitions for Pelagic Juvenile and Rafting custom panels */
export const PANEL_TOOLTIPS: Record<string, string> = {
  'Pelagic Juvenile':
    'Records of extended pelagic phase after settlement in benthic/demersal fishes and name given to this phase in the source.',
  'Pelagic Juvenile Size':
    'Size (mm) of sampled pelagic juveniles.',
  'Pelagic Juvenile Duration':
    'Age (days post-hatch) of sampled pelagic juveniles.',
  'Rafting':
    "Description of the floatsam and stages associated with rafting behaviour. Life stage(s) associated with rafting behaviour (A = adult, J = juvenile, L = larvae). Multiple stages found associated with a floatsam are separated by '|' while uncertainties about stage identification are indicated by 'and/or'. Floatsam categories include: 'algae/plant' (any plant/algae matter such as dead logs except mangrove litter), 'FAD' (man-made Fish Aggregating Device), 'gelatinous zooplankton' (any Cnidaria, Ctenophora or pelagic Tunicata), 'mangrove litter' (floating debris originating from mangroves), 'other object' (undefined category for some Castro et al. 2002 records), 'pelagic vertebrate', 'plastic' (except FAD), or 'tsunamis debris' (any object set drifting by a tsunami).",
  'Rafting Size':
    'Size (mm) of sampled rafters.',
  'Rafting Age':
    'Age (days post-hatch) of sampled rafters.',
};

/** Column-level tooltip definitions for raw data tables */
export const COLUMN_TOOLTIPS: Record<string, string> = {
  // Pelagic Juvenile columns
  pj_name: 'Valid scientific name of the species',
  pj_keyword: 'Name given to the pelagic juvenile stage or key behavioral description',
  pj_remarks: 'Additional observations about the pelagic juvenile stage',
  pj_mean: 'Mean value of the measurement',
  pj_min: 'Minimum value recorded',
  pj_max: 'Maximum value recorded',
  pj_conf: 'Confidence interval value',
  pj_mean_type: 'Type of mean (arithmetic, geometric, etc.)',
  pj_conf_type: 'Type of confidence interval (SD, SE, 95% CI, etc.)',
  pj_unit: 'Unit of measurement (mm for size, days for duration)',
  pj_ext_ref: 'Source study of the information cited in the main reference',
  pj_reference: 'Main bibliographic reference for this record',
  // Rafting columns
  raft_name: 'Valid scientific name of the species',
  raft_flotsam: 'Type of floating object the larvae/juveniles associate with (Sargassum, debris, etc.)',
  raft_stage: 'Developmental stage during rafting association',
  raft_age: 'Age category during rafting',
  raft_mean: 'Mean value of the measurement',
  raft_min: 'Minimum value recorded',
  raft_max: 'Maximum value recorded',
  raft_mean_type: 'Type of mean (arithmetic, geometric, etc.)',
  raft_length_type: 'Type of length measurement (SL, TL, NL, etc.)',
  raft_unit: 'Unit of measurement (mm for size)',
  raft_ext_ref: 'Source study of the information cited in the main reference',
  raft_reference: 'Main bibliographic reference for this record',
};

/** Qualitative egg trait tooltips (keyed by uppercase trait key used in EggQualitativePanel) */
export const QUALITATIVE_TRAIT_TOOLTIPS: Record<string, string> = {
  EGG_LOCATION:
    'Description of the embryo location with, between parentheses, details on the reproductive mode, and if oviparous, on the position of eggs in the water column. Additional details of the position of eggs in the water column are also provided below.',
  EGG_SHAPE:
    'Sphericity of eggs (if oviparous)',
  NB_OIL_GLOBULE:
    'Number or qualitative estimates of lipid-rich droplet(s) inside the egg. Oil globules ensure egg buoyancy and providing energy reserves.',
};

/** Column tooltips for qualitative egg record tables */
export const QUALITATIVE_COLUMN_TOOLTIPS: Record<string, Record<string, string>> = {
  EGG_LOCATION: {
    Species: 'Valid scientific name of the species',
    Value: 'Embryo location category (e.g. Pelagic eggs, Demersal eggs, Viviparous)',
    Details: 'Reproductive mode details and egg position in the water column',
    'Main reference': 'Main bibliographic reference for this record',
    'External reference': 'Source study cited in the main reference',
  },
  EGG_SHAPE: {
    Species: 'Valid scientific name of the species',
    Value: 'Egg shape (Spherical or Non-spherical)',
    'Main reference': 'Main bibliographic reference for this record',
    'External reference': 'Source study cited in the main reference',
  },
  NB_OIL_GLOBULE: {
    Species: 'Valid scientific name of the species',
    Value: 'Number or qualitative description of oil globule(s)',
    'Main reference': 'Main bibliographic reference for this record',
    'External reference': 'Source study cited in the main reference',
  },
};

/** Trait-level tooltip definitions (keyed by trait key in DISPLAY_GROUPS) */
export const TRAIT_TOOLTIPS: Record<string, string> = {
  // Egg & Incubation
  egg_location:
    'Description of the embryo location with, between parentheses, details on the reproductive mode, and if oviparous, on the position of eggs in the water column. Additional details of the position of eggs in the water column are also provided below.',
  egg_shape:
    'Sphericity of eggs (if oviparous)',
  egg_diameter:
    'Diameter of eggs in mm. Only shown when egg shape is spherical (width = length)',
  egg_length:
    'Length of eggs in mm (longest axis). Only shown when egg shape is non-spherical (width \u2260 length)',
  egg_width:
    'Width of eggs in mm (shortest axis). Only shown when egg shape is non-spherical (width \u2260 length)',
  egg_volume:
    'Egg volume in mm\u00B3. Spherical: (4/3)\u03C0r\u00B3. Non-spherical: (4/3)\u03C0 \u00D7 (L/2) \u00D7 (W/2)\u00B2.',
  yolk_diameter:
    'Nutrient-rich material inside the egg nourishing the embryo until exogenous feeding. Size = yolk diameter in mm.',
  oil_globule_size:
    'Lipid-rich droplet(s) inside the egg ensuring egg buoyancy and providing energy reserves. Size = diameter in mm.',
  oil_globule_number:
    'Count or range of oil globule(s) in the egg. May change during development (e.g., multiple coalescing into one).',
  incubation_duration:
    'Duration of egg incubation or gestation (depending on reproduction mode), with associated water temperature.',
  // Hatching & Pre-flexion
  hatching_size:
    'Size of larvae at hatching (egg-based reproduction) or parturition, with associated rearing temperature.',
  first_feeding_age:
    'Timing (days post-hatch) at first exogenous feeding \u2014 when larvae start feeding from external sources.',
  first_feeding_size:
    'Size (mm) at first exogenous feeding \u2014 when larvae start feeding from external sources.',
  yolk_absorption_age:
    'Timing of yolk-sac absorption \u2014 complete depletion of endogenous egg resources.',
  yolk_absorbed_size:
    'Size at yolk-sac absorption \u2014 complete depletion of endogenous egg resources.',
  // Flexion
  flexion_age:
    'Timing (days post-hatch) of notochord (embryonic vertebrate column) flexion. The upward bending of the notochord is associated with the ossification of caudal fin elements that allows efficient swimming, which marks the transition from the pre-flexion to post-flexion stage.',
  flexion_size:
    'Size (mm) of notochord (embryonic vertebrate column) flexion. The upward bending of the notochord is associated with the ossification of caudal fin elements that allows efficient swimming, which marks the transition from the pre-flexion to post-flexion stage.',
  // Metamorphosis
  metamorphosis_age:
    'Timing (days post-hatch) at morphological metamorphosis: the transition from larval to juvenile stage. This process largely varies among fish families, but is often characterized by the appearance of scales, the growth of all fin spines/rays to reach the adult count, the acquisition of juvenile coloration, and/or the loss of specialized larval attributes.',
  metamorphosis_duration:
    'Duration (days) at morphological metamorphosis: the transition from larval to juvenile stage. This process largely varies among fish families, but is often characterized by the appearance of scales, the growth of all fin spines/rays to reach the adult count, the acquisition of juvenile coloration, and/or the loss of specialized larval attributes.',
  metamorphosis_size:
    'Size (mm) at morphological metamorphosis: the transition from larval to juvenile stage. This process largely varies among fish families, but is often characterized by the appearance of scales, the growth of all fin spines/rays to reach the adult count, the acquisition of juvenile coloration, and/or the loss of specialized larval attributes.',
  // Settlement
  settlement_age:
    'This database specific to benthic fishes (living near the bottom) provides the age at settlement (days post-hatch) on a substrate, which marks the transition from a pelagic (offshore) to a benthic lifestyle.',
  settlement_size:
    'This database specific to benthic fishes (living near the bottom) provides the size at settlement (mm) on a substrate, which marks the transition from a pelagic (offshore) to a benthic lifestyle.',
  // Swimming
  critical_swimming_speed:
    'Absolute (cm/s) critical swimming speed (Ucrit), which is the maximum sustained velocity measured in laboratory flume experiments with incrementally increasing flow.',
  critical_swimming_speed_rel:
    'Relative (BL/s) critical swimming speed (Ucrit), which is the maximum sustained velocity measured in laboratory flume experiments with incrementally increasing flow. Relative swimming speeds were computed from the size of tested individuals (BL/s = body length per second).',
  in_situ_swimming_speed:
    'Absolute (cm/s) in-situ swimming speed (ISS), which is the routine speed measured while scuba diving to follow larvae in the wild.',
  in_situ_swimming_speed_rel:
    'Relative (BL/s) in-situ swimming speed (ISS), which is the routine speed measured while scuba diving to follow larvae in the wild. Relative swimming speeds were computed from the size of tested individuals (BL/s = body length per second).',
  // Vertical position
  vertical_day_depth:
    'Daytime depth of larvae in the water column, standardized by sampling effort (see metadata).',
  vertical_night_depth:
    'Nighttime depth of larvae in the water column, standardized by sampling effort (see metadata).',
  vertical_distribution:
    'Daytime and nighttime (combined) depth of larvae in the water column, standardized by sampling effort (see metadata).',
};
