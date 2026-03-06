/**
 * Zod schemas for developmental stage databases.
 *
 * Includes: larval growth, hatching size, incubation, first feeding,
 * flexion, metamorphosis, and pelagic juvenile duration.
 *
 * All trait columns use .optional().nullable() to handle missing columns and null values.
 */
import { z } from 'zod';
import {
  BaseRowSchema,
  LocationColumnsSchema,
  SamplingDateColumnsSchema,
  SampleSizeSchema,
} from './base.schema';

/**
 * Larval Growth database schema.
 *
 * Contains growth rate data (mm/day).
 */
export const LarvalGrowthSchema = BaseRowSchema.extend({
  // Growth rate measurements (mm/day)
  GROWTH_RATE_MM_DAY_MEAN: z.coerce.number().optional().nullable(),
  GROWTH_RATE_MM_DAY_MIN: z.coerce.number().optional().nullable(),
  GROWTH_RATE_MM_DAY_MAX: z.coerce.number().optional().nullable(),
  GROWTH_RATE_MM_DAY_CONF: z.coerce.number().optional().nullable(),
  GROWTH_RATE_MM_DAY_CONF_TYPE: z.string().optional().nullable(),

  // Growth measurement details
  GROWTH_METHOD: z.string().optional().nullable(),
  SIZE_START_MM: z.coerce.number().optional().nullable(),
  SIZE_END_MM: z.coerce.number().optional().nullable(),
  AGE_START_DPH: z.coerce.number().optional().nullable(),
  AGE_END_DPH: z.coerce.number().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .merge(SamplingDateColumnsSchema)
  .passthrough();

export type LarvalGrowthRow = z.infer<typeof LarvalGrowthSchema>;

/**
 * Hatching/parturition Size database schema.
 *
 * Contains size at hatching data (mm).
 */
export const HatchingSizeSchema = BaseRowSchema.extend({
  // Size at hatching (mm)
  HATCH_SIZE_MM_MEAN: z.coerce.number().optional().nullable(),
  HATCH_SIZE_MM_MIN: z.coerce.number().optional().nullable(),
  HATCH_SIZE_MM_MAX: z.coerce.number().optional().nullable(),
  HATCH_SIZE_MM_CONF: z.coerce.number().optional().nullable(),
  HATCH_SIZE_MM_CONF_TYPE: z.string().optional().nullable(),

  // Size type
  HATCH_SIZE_TYPE: z.string().optional().nullable(), // standard length, total length, etc.

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .passthrough();

export type HatchingSizeRow = z.infer<typeof HatchingSizeSchema>;

/**
 * Incubation database schema.
 *
 * Contains incubation duration data (hours).
 */
export const IncubationSchema = BaseRowSchema.extend({
  // Incubation duration (hours)
  INCUBATION_HOURS_MEAN: z.coerce.number().optional().nullable(),
  INCUBATION_HOURS_MIN: z.coerce.number().optional().nullable(),
  INCUBATION_HOURS_MAX: z.coerce.number().optional().nullable(),
  INCUBATION_HOURS_CONF: z.coerce.number().optional().nullable(),
  INCUBATION_HOURS_CONF_TYPE: z.string().optional().nullable(),

  // Temperature conditions (critical for incubation rate)
  INCUBATION_TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),

  // Salinity conditions
  SALINITY_PSU: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .passthrough();

export type IncubationRow = z.infer<typeof IncubationSchema>;

/**
 * First Feeding Age database schema.
 *
 * Contains age at first feeding data (days post hatching).
 */
export const FirstFeedingAgeSchema = BaseRowSchema.extend({
  // Age at first feeding (days post hatching)
  FF_AGE_DPH_MEAN: z.coerce.number().optional().nullable(),
  FF_AGE_DPH_MIN: z.coerce.number().optional().nullable(),
  FF_AGE_DPH_MAX: z.coerce.number().optional().nullable(),
  FF_AGE_DPH_CONF: z.coerce.number().optional().nullable(),
  FF_AGE_DPH_CONF_TYPE: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .passthrough();

export type FirstFeedingAgeRow = z.infer<typeof FirstFeedingAgeSchema>;

/**
 * First Feeding Size database schema.
 *
 * Contains size at first feeding data (mm).
 */
export const FirstFeedingSizeSchema = BaseRowSchema.extend({
  // Size at first feeding (mm)
  FF_SIZE_MM_MEAN: z.coerce.number().optional().nullable(),
  FF_SIZE_MM_MIN: z.coerce.number().optional().nullable(),
  FF_SIZE_MM_MAX: z.coerce.number().optional().nullable(),
  FF_SIZE_MM_CONF: z.coerce.number().optional().nullable(),
  FF_SIZE_MM_CONF_TYPE: z.string().optional().nullable(),

  // Size type
  FF_SIZE_TYPE: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .passthrough();

export type FirstFeedingSizeRow = z.infer<typeof FirstFeedingSizeSchema>;

/**
 * Flexion Age database schema.
 *
 * Contains age at flexion (notochord flexion) data (days post hatching).
 */
export const FlexionAgeSchema = BaseRowSchema.extend({
  // Age at flexion (days post hatching)
  FLEX_AGE_DPH_MEAN: z.coerce.number().optional().nullable(),
  FLEX_AGE_DPH_MIN: z.coerce.number().optional().nullable(),
  FLEX_AGE_DPH_MAX: z.coerce.number().optional().nullable(),
  FLEX_AGE_DPH_CONF: z.coerce.number().optional().nullable(),
  FLEX_AGE_DPH_CONF_TYPE: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .merge(SamplingDateColumnsSchema)
  .passthrough();

export type FlexionAgeRow = z.infer<typeof FlexionAgeSchema>;

/**
 * Flexion Size database schema.
 *
 * Contains size at flexion data (mm).
 */
export const FlexionSizeSchema = BaseRowSchema.extend({
  // Size at flexion (mm)
  FLEX_SIZE_MM_MEAN: z.coerce.number().optional().nullable(),
  FLEX_SIZE_MM_MIN: z.coerce.number().optional().nullable(),
  FLEX_SIZE_MM_MAX: z.coerce.number().optional().nullable(),
  FLEX_SIZE_MM_CONF: z.coerce.number().optional().nullable(),
  FLEX_SIZE_MM_CONF_TYPE: z.string().optional().nullable(),

  // Size type
  FLEX_SIZE_TYPE: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .merge(SamplingDateColumnsSchema)
  .passthrough();

export type FlexionSizeRow = z.infer<typeof FlexionSizeSchema>;

/**
 * Metamorphosis Age database schema.
 *
 * Contains age at metamorphosis data (days post hatching).
 */
export const MetamorphosisAgeSchema = BaseRowSchema.extend({
  // Age at metamorphosis (days post hatching)
  META_AGE_DPH_MEAN: z.coerce.number().optional().nullable(),
  META_AGE_DPH_MIN: z.coerce.number().optional().nullable(),
  META_AGE_DPH_MAX: z.coerce.number().optional().nullable(),
  META_AGE_DPH_CONF: z.coerce.number().optional().nullable(),
  META_AGE_DPH_CONF_TYPE: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .merge(SamplingDateColumnsSchema)
  .passthrough();

export type MetamorphosisAgeRow = z.infer<typeof MetamorphosisAgeSchema>;

/**
 * Metamorphosis Size database schema.
 *
 * Contains size at metamorphosis data (mm).
 */
export const MetamorphosisSizeSchema = BaseRowSchema.extend({
  // Size at metamorphosis (mm)
  META_SIZE_MM_MEAN: z.coerce.number().optional().nullable(),
  META_SIZE_MM_MIN: z.coerce.number().optional().nullable(),
  META_SIZE_MM_MAX: z.coerce.number().optional().nullable(),
  META_SIZE_MM_CONF: z.coerce.number().optional().nullable(),
  META_SIZE_MM_CONF_TYPE: z.string().optional().nullable(),

  // Size type
  META_SIZE_TYPE: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .merge(SamplingDateColumnsSchema)
  .passthrough();

export type MetamorphosisSizeRow = z.infer<typeof MetamorphosisSizeSchema>;

/**
 * Pelagic Juvenile Duration database schema.
 *
 * Contains pelagic larval duration (PLD) data (days).
 */
export const PelagicJuvenileSchema = BaseRowSchema.extend({
  // Pelagic larval duration (days)
  PLD_DAYS_MEAN: z.coerce.number().optional().nullable(),
  PLD_DAYS_MIN: z.coerce.number().optional().nullable(),
  PLD_DAYS_MAX: z.coerce.number().optional().nullable(),
  PLD_DAYS_CONF: z.coerce.number().optional().nullable(),
  PLD_DAYS_CONF_TYPE: z.string().optional().nullable(),

  // Method used to determine PLD
  PLD_METHOD: z.string().optional().nullable(),

  // Temperature conditions
  TEMP_C: z.coerce.number().optional().nullable(),
  TEMP_C_MIN: z.coerce.number().optional().nullable(),
  TEMP_C_MAX: z.coerce.number().optional().nullable(),
})
  .merge(SampleSizeSchema)
  .merge(LocationColumnsSchema)
  .merge(SamplingDateColumnsSchema)
  .passthrough();

export type PelagicJuvenileRow = z.infer<typeof PelagicJuvenileSchema>;
