/**
 * Configuration for species detail display groups.
 *
 * Extracted from species-detail.tsx for testability and reuse.
 * Defines which traits appear in each section and their display order.
 */
import type { LarvalStage } from './stage-icon';

/**
 * Trait group configuration for display.
 */
export interface TraitGroupConfig {
  title: string;
  stage?: LarvalStage;
  traits: string[];
  unit: string;
}

/**
 * Configuration for grouping traits in the UI.
 * Maps trait types to display groups.
 * Trait types must match extractTraitsFromRows in data-repository.ts.
 */
export const DISPLAY_GROUPS: TraitGroupConfig[] = [
  {
    title: 'Egg & Incubation',
    stage: 'egg',
    traits: [
      'egg_diameter',
      'egg_volume',
      'yolk_diameter',
      'oil_globule_size',
      'incubation_duration',
    ],
    unit: 'mm',
  },
  {
    // US-1.6: Renamed from "Hatching & Early Development"
    title: 'Hatching & Pre-flexion Stage',
    stage: 'yolk-sac',
    traits: [
      'hatching_size',
      'first_feeding_age',
      'first_feeding_size',
      'yolk_absorption_age',
      'yolk_absorbed_size',
    ],
    unit: 'mm',
  },
  {
    title: 'Flexion Stage',
    stage: 'flexion',
    traits: [
      'flexion_age',
      'flexion_size',
    ],
    unit: 'mm',
  },
  {
    title: 'Metamorphosis',
    stage: 'metamorphosis',
    traits: [
      'metamorphosis_age',
      'metamorphosis_size',
    ],
    unit: 'mm',
  },
  {
    title: 'Settlement',
    stage: 'settlement',
    traits: [
      'settlement_age',
      'settlement_size',
    ],
    unit: 'days',
  },
  {
    title: 'Swimming Ability',
    traits: [
      'critical_swimming_speed',
      'critical_swimming_speed_rel',
      'in_situ_swimming_speed',
      'in_situ_swimming_speed_rel',
    ],
    unit: 'cm/s',
  },
  {
    title: 'Behavior & Ecology',
    traits: [
      'vertical_distribution',
      'rafting_behavior',
      'rafting_size',
    ],
    unit: '',
  },
];

/**
 * Unit mapping for specific traits (overrides group default).
 */
export const TRAIT_UNITS: Record<string, string> = {
  // Egg & Incubation
  egg_diameter: 'mm',
  egg_volume: 'mm³',
  yolk_diameter: 'mm',
  oil_globule_size: 'mm',
  incubation_duration: 'hours',
  // Hatching & Pre-flexion Stage
  hatching_size: 'mm',
  first_feeding_age: 'days',
  first_feeding_size: 'mm',
  yolk_absorption_age: 'days',
  yolk_absorbed_size: 'mm',
  // Flexion
  flexion_age: 'days',
  flexion_size: 'mm',
  // Metamorphosis
  metamorphosis_age: 'days',
  metamorphosis_size: 'mm',
  // Settlement
  settlement_age: 'days',
  settlement_size: 'mm',
  // Swimming
  critical_swimming_speed: 'cm/s',
  critical_swimming_speed_rel: 'BL/s',
  in_situ_swimming_speed: 'cm/s',
  in_situ_swimming_speed_rel: 'BL/s',
  // Behavior
  vertical_distribution: 'm depth',
  rafting_behavior: '',
  rafting_size: 'mm',
};
