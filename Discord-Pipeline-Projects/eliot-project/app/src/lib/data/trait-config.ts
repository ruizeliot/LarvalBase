/**
 * Centralized trait → slug → database file → description mapping.
 * Used by trait pages, API routes, and homepage barplot links.
 */

export interface TraitPageConfig {
  slug: string;
  displayName: string;
  description: string;
  /** Database filename(s) in the database/ directory (@-delimited .txt files) */
  databaseFiles: string[];
  /** Labels for each export button (parallel to databaseFiles) */
  exportLabels: string[];
  /** Icon path for the page header */
  iconPath: string;
}

export const TRAIT_CONFIGS: TraitPageConfig[] = [
  {
    slug: 'egg-traits',
    displayName: 'Egg traits',
    description: 'This species-level database documents egg characteristics, including position in the water column, shape, size, and volume, as well as information about the yolk and oil globules inside the egg.',
    databaseFiles: ['Egg_database_final_03.2026.txt'],
    exportLabels: ['Export the egg traits table for all species in the selected area'],
    iconPath: '/icons/sections/Egg %26 Incubation.svg',
  },
  {
    slug: 'incubation-gestation',
    displayName: 'Incubation/gestation',
    description: 'This species-level database records the duration of egg incubation or gestation (depending on the reproduction mode), along with associated temperature data.',
    databaseFiles: ['Incubation_and_gestation_database_final_03.2026.txt'],
    exportLabels: ['Export the incubation/gestation table for all species in the selected area'],
    iconPath: '/icons/sections/Egg %26 Incubation.svg',
  },
  {
    slug: 'hatching-parturition-size',
    displayName: 'Hatching/parturition size',
    description: 'This species-level database documents the size of larvae at hatching or parturition (depending on the reproduction mode), along with rearing temperature data.',
    databaseFiles: ['Hatching_size_database_final_03.2026.txt'],
    exportLabels: ['Export the hatching/parturition size table for all species in the selected area'],
    iconPath: '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  },
  {
    slug: 'first-feeding-age',
    displayName: 'First feeding age',
    description: 'This species-level database tracks the timing of first feeding (start of exogenous nutrition) and yolk-sac absorption (complete depletion of egg resources), along with rearing temperature data.',
    databaseFiles: ['First-feeding_and_yolk-absorption_age_database_final_03.2026.txt'],
    exportLabels: ['Export the first feeding age table for all species in the selected area'],
    iconPath: '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  },
  {
    slug: 'first-feeding-size',
    displayName: 'First feeding size',
    description: 'This species-level database records the size of larvae at first feeding (start of exogenous nutrition) and yolk-sac absorption (complete depletion of egg resources), along with rearing temperature data.',
    databaseFiles: ['First-feeding_and_yolk-absorption_size_database_final_06.2025.txt'],
    exportLabels: ['Export the first feeding size table for all species in the selected area'],
    iconPath: '/icons/sections/Hatching %26 Pre-flexion Stage.svg',
  },
  {
    slug: 'flexion-age',
    displayName: 'Flexion age',
    description: 'This species-level database tracks the timing of flexion, which corresponds to upward notochord bending associated with the ossification of fins. It includes rearing temperature data and details about the flexion process.',
    databaseFiles: ['Flexion_age_database_final_03.2026.txt'],
    exportLabels: ['Export the flexion age table for all species in the selected area'],
    iconPath: '/icons/sections/Flexion Stage.svg',
  },
  {
    slug: 'flexion-size',
    displayName: 'Flexion size',
    description: 'This species-level database records the size of larvae at notochord flexion (upward notochord bending associated with the ossification of fins), along with rearing temperature data and details about the flexion process.',
    databaseFiles: ['Flexion_size_database_final_03.2026.txt'],
    exportLabels: ['Export the flexion size table for all species in the selected area'],
    iconPath: '/icons/sections/Flexion Stage.svg',
  },
  {
    slug: 'metamorphosis-age',
    displayName: 'Metamorphosis age',
    description: 'This species-level database documents the timing and duration of metamorphosis, which is the transition from larval to juvenile stage. This process largely varies among fish families, but is often characterized by the appearance of scales, the growth of all fin spines/rays to reach the adult count, the acquisition of juvenile coloration, and/or the loss of specialized larval attributes.',
    databaseFiles: ['Metamorphosis_age_database_final_03.2026.txt'],
    exportLabels: ['Export the metamorphosis age table for all species in the selected area'],
    iconPath: '/icons/sections/Metamorphosis.svg',
  },
  {
    slug: 'metamorphosis-size',
    displayName: 'Metamorphosis size',
    description: 'This species-level database records the size of fish at metamorphosis (the transition from larval to juvenile stage), along with rearing temperature data and details about the metamorphosis process.',
    databaseFiles: ['Metamorphosis_size_database_final_03.2026.txt'],
    exportLabels: ['Export the metamorphosis size table for all species in the selected area'],
    iconPath: '/icons/sections/Metamorphosis.svg',
  },
  {
    slug: 'age-at-length-data',
    displayName: 'Age-at-length data',
    description: 'This individual-level database contains records of age-length/weight measurements across at least two-thirds of the larval phase, in relation to temperature (or other factors in the REMARKS column). A second database provides equations for growth models fitted in the original article from points reported in the age-at-length database.',
    databaseFiles: [
      'Larval_age-length_data_final_03.2026.txt',
      'Growth_model_parameters_database_final_06.2025.txt',
    ],
    exportLabels: [
      'Export the age-at-length table for all species in the selected area',
      'Export the growth models table for all species in the selected area',
    ],
    iconPath: '/icons/sections/Age-at-Length.svg',
  },
  {
    slug: 'settlement-age',
    displayName: 'Settlement age',
    description: 'This database specific to benthic fishes (living near the bottom) provides the age at settlement on a substrate, which marks the transition from a pelagic (offshore) to a benthic lifestyle. It includes rearing temperature data.',
    databaseFiles: ['Settlement_age_database_final_03.2026.txt'],
    exportLabels: ['Export the settlement age table for all species in the selected area'],
    iconPath: '/icons/sections/Settlement.svg',
  },
  {
    slug: 'settlement-size',
    displayName: 'Settlement size',
    description: 'This database specific to benthic fishes (living near the bottom) provides the size at settlement on a substrate, which marks the transition from a pelagic (offshore) to a benthic lifestyle. It includes rearing temperature data.',
    databaseFiles: ['Settlement_size_database_final_03.2026.txt'],
    exportLabels: ['Export the settlement size table for all species in the selected area'],
    iconPath: '/icons/sections/Settlement.svg',
  },
  {
    slug: 'critical-swimming',
    displayName: 'Critical swimming',
    description: 'This species-level database compiles measurements of critical swimming speed (Ucrit), determined through increasing velocity tests in swimming chambers at or near the settlement stage of benthic/demersal fishes.',
    databaseFiles: ['Ucrit_speed_database_final_03.2026.txt'],
    exportLabels: ['Export the critical swimming speed table for all species in the selected area'],
    iconPath: '/icons/Swimming speed.svg',
  },
  {
    slug: 'in-situ-swimming',
    displayName: 'In situ swimming',
    description: 'This species-level database contains measurements of in situ swimming speed (ISS), corresponding to routine speed measured while scuba diving to follow larvae in the wild at or near the settlement stage of benthic/demersal fishes.',
    databaseFiles: ['ISS_speed_database_final_01.2026.txt'],
    exportLabels: ['Export the in situ swimming speed table for all species in the selected area'],
    iconPath: '/icons/Swimming speed.svg',
  },
  {
    slug: 'vertical-position',
    displayName: 'Vertical position',
    description: 'This database documents the vertical distribution of fish larvae (genus and family-level identifications also taken into account) in the first 100m of the water column (standardized by sampling effort), as different depths experience different current regimes.',
    databaseFiles: ['Vertical_position_database_final_01.2026.txt'],
    exportLabels: ['Export the vertical position table for all species in the selected area'],
    iconPath: '/icons/Vertical position.svg',
  },
  {
    slug: 'pelagic-juvenile',
    displayName: 'Pelagic juvenile',
    description: 'This database records the possibility of an extended pelagic phase after settlement in benthic/demersal fishes, providing species-level records of the age and size of sampled pelagic juveniles.',
    databaseFiles: ['Pelagic_juvenile_database_final_03.2026.txt'],
    exportLabels: ['Export the pelagic juvenile table for all species in the selected area'],
    iconPath: '/icons/sections/Pelagic Juvenile.svg',
  },
  {
    slug: 'rafting',
    displayName: 'Rafting',
    description: 'This database documents associations of fish larvae and juveniles with floating objects or organisms in the pelagic environment (e.g., algae, FAD, gelatinous zooplankton, mangrove litter, plastic, tsunamis debris), which could largely increase the dispersal potential of rafters.',
    databaseFiles: ['Rafting_database_final_03.2026.txt'],
    exportLabels: ['Export the rafting table for all species in the selected area'],
    iconPath: '/icons/sections/Rafting.svg',
  },
];

/** Map from slug to config for fast lookup */
export const TRAIT_BY_SLUG = new Map<string, TraitPageConfig>(
  TRAIT_CONFIGS.map((c) => [c.slug, c])
);

/** Map from display name to slug (for barplot links) */
export const TRAIT_SLUG_MAP: Record<string, string> = {
  'Egg traits': 'egg-traits',
  'Incubation/gestation': 'incubation-gestation',
  'Hatching/parturition size': 'hatching-parturition-size',
  'First feeding age': 'first-feeding-age',
  'First feeding size': 'first-feeding-size',
  'Flexion age': 'flexion-age',
  'Flexion size': 'flexion-size',
  'Metamorphosis age': 'metamorphosis-age',
  'Metamorphosis size': 'metamorphosis-size',
  'Age-at-length data': 'age-at-length-data',
  'Settlement age': 'settlement-age',
  'Settlement size': 'settlement-size',
  'Critical swimming': 'critical-swimming',
  'In situ swimming': 'in-situ-swimming',
  'Vertical position': 'vertical-position',
  'Pelagic juvenile': 'pelagic-juvenile',
  'Rafting': 'rafting',
  'Colored pictures': 'GALLERY',
};
