/**
 * Database type definitions for multi-database loading.
 *
 * Defines the 17 database categories from fish_larvae_traits_db,
 * metadata for each database, and type-safe mappings.
 */

/**
 * Union type covering all 17 database categories.
 * Each category corresponds to a specific trait database.
 * Note: Yolk data is included in the egg database.
 */
export type DatabaseType =
  | 'settlement_age'
  | 'settlement_size'
  | 'egg'
  | 'larval_growth'
  | 'hatching_size'
  | 'incubation'
  | 'first_feeding_age'
  | 'first_feeding_size'
  | 'flexion_age'
  | 'flexion_size'
  | 'metamorphosis_age'
  | 'metamorphosis_size'
  | 'critical_swimming'
  | 'in_situ_swimming'
  | 'vertical_position'
  | 'rafting'
  | 'pelagic_juvenile'
  | 'unknown';

/**
 * Category groupings for database types.
 */
export type DatabaseCategory =
  | 'settlement'
  | 'egg'
  | 'developmental'
  | 'swimming'
  | 'behavior'
  | 'other';

/**
 * Metadata for a single database file.
 */
export interface DatabaseMetadata {
  /** Database type identifier */
  type: DatabaseType;

  /** Filename (e.g., 'settlement_age_database.csv') */
  filename: string;

  /** Human-readable display name */
  displayName: string;

  /** Category grouping */
  category: DatabaseCategory;

  /** Column names containing trait data (excluding common columns) */
  traitColumns: string[];
}

/**
 * Mapping of database filenames to their metadata.
 * Includes all 18+ database files even if not yet available.
 * System will gracefully skip missing files.
 */
export const DATABASE_METADATA: Record<string, DatabaseMetadata> = {
  // Settlement databases
  'settlement_age_database.csv': {
    type: 'settlement_age',
    filename: 'settlement_age_database.csv',
    displayName: 'Settlement Age',
    category: 'settlement',
    traitColumns: [
      'SET_AGE_DPH_MEAN',
      'SET_AGE_DPH_MIN',
      'SET_AGE_DPH_MAX',
      'SET_AGE_DPH_CONF',
      'SET_AGE_DPH_CONF_TYPE',
    ],
  },
  'settlement_size_database.csv': {
    type: 'settlement_size',
    filename: 'settlement_size_database.csv',
    displayName: 'Settlement Size',
    category: 'settlement',
    traitColumns: [
      'SET_SIZE_MM_MEAN',
      'SET_SIZE_MM_MIN',
      'SET_SIZE_MM_MAX',
      'SET_SIZE_MM_CONF',
      'SET_SIZE_MM_CONF_TYPE',
    ],
  },

  // Egg database (includes yolk and oil globule data)
  'egg_database.csv': {
    type: 'egg',
    filename: 'egg_database.csv',
    displayName: 'Egg Characteristics',
    category: 'egg',
    traitColumns: [
      'EGG_L_MEAN',
      'EGG_L_MIN',
      'EGG_L_MAX',
      'EGG_W_MEAN',
      'EGG_SHAPE',
      'EGG_LOCATION',
      'YOLK_SIZE_MEAN',
      'OIL_GLOBULE_SIZE_MEAN',
    ],
  },

  // Developmental stage databases
  'larval_growth_database.csv': {
    type: 'larval_growth',
    filename: 'larval_growth_database.csv',
    displayName: 'Larval Growth Rate',
    category: 'developmental',
    traitColumns: [
      'GROWTH_RATE_MM_DAY_MEAN',
      'GROWTH_RATE_MM_DAY_MIN',
      'GROWTH_RATE_MM_DAY_MAX',
      'GROWTH_RATE_MM_DAY_CONF',
    ],
  },
  'hatching_size_database.csv': {
    type: 'hatching_size',
    filename: 'hatching_size_database.csv',
    displayName: 'Hatching/parturition Size',
    category: 'developmental',
    traitColumns: [
      'HATCH_SIZE_MM_MEAN',
      'HATCH_SIZE_MM_MIN',
      'HATCH_SIZE_MM_MAX',
      'HATCH_SIZE_MM_CONF',
    ],
  },
  'incubation_database.csv': {
    type: 'incubation',
    filename: 'incubation_database.csv',
    displayName: 'Incubation/gestation Duration',
    category: 'developmental',
    traitColumns: [
      'INCUBATION_HOURS_MEAN',
      'INCUBATION_HOURS_MIN',
      'INCUBATION_HOURS_MAX',
      'INCUBATION_TEMP_C',
    ],
  },
  'first_feeding_age_database.csv': {
    type: 'first_feeding_age',
    filename: 'first_feeding_age_database.csv',
    displayName: 'First Feeding Age',
    category: 'developmental',
    traitColumns: [
      'FF_AGE_DPH_MEAN',
      'FF_AGE_DPH_MIN',
      'FF_AGE_DPH_MAX',
      'FF_AGE_DPH_CONF',
    ],
  },
  'first_feeding_size_database.csv': {
    type: 'first_feeding_size',
    filename: 'first_feeding_size_database.csv',
    displayName: 'First Feeding Size',
    category: 'developmental',
    traitColumns: [
      'FF_SIZE_MM_MEAN',
      'FF_SIZE_MM_MIN',
      'FF_SIZE_MM_MAX',
      'FF_SIZE_MM_CONF',
    ],
  },
  'flexion_age_database.csv': {
    type: 'flexion_age',
    filename: 'flexion_age_database.csv',
    displayName: 'Flexion Age',
    category: 'developmental',
    traitColumns: [
      'FLEX_AGE_DPH_MEAN',
      'FLEX_AGE_DPH_MIN',
      'FLEX_AGE_DPH_MAX',
      'FLEX_AGE_DPH_CONF',
    ],
  },
  'flexion_size_database.csv': {
    type: 'flexion_size',
    filename: 'flexion_size_database.csv',
    displayName: 'Flexion Size',
    category: 'developmental',
    traitColumns: [
      'FLEX_SIZE_MM_MEAN',
      'FLEX_SIZE_MM_MIN',
      'FLEX_SIZE_MM_MAX',
      'FLEX_SIZE_MM_CONF',
    ],
  },
  'metamorphosis_age_database.csv': {
    type: 'metamorphosis_age',
    filename: 'metamorphosis_age_database.csv',
    displayName: 'Metamorphosis Age',
    category: 'developmental',
    traitColumns: [
      'META_AGE_DPH_MEAN',
      'META_AGE_DPH_MIN',
      'META_AGE_DPH_MAX',
      'META_AGE_DPH_CONF',
    ],
  },
  'metamorphosis_size_database.csv': {
    type: 'metamorphosis_size',
    filename: 'metamorphosis_size_database.csv',
    displayName: 'Metamorphosis Size',
    category: 'developmental',
    traitColumns: [
      'META_SIZE_MM_MEAN',
      'META_SIZE_MM_MIN',
      'META_SIZE_MM_MAX',
      'META_SIZE_MM_CONF',
    ],
  },
  'pelagic_juvenile_database.csv': {
    type: 'pelagic_juvenile',
    filename: 'pelagic_juvenile_database.csv',
    displayName: 'Pelagic Juvenile Duration',
    category: 'developmental',
    traitColumns: [
      'PLD_DAYS_MEAN',
      'PLD_DAYS_MIN',
      'PLD_DAYS_MAX',
      'PLD_DAYS_CONF',
    ],
  },

  // Swimming databases
  'critical_swimming_speed_database.csv': {
    type: 'critical_swimming',
    filename: 'critical_swimming_speed_database.csv',
    displayName: 'Critical Swimming Speed',
    category: 'swimming',
    traitColumns: [
      'UCRIT_CM_S_MEAN',
      'UCRIT_CM_S_MIN',
      'UCRIT_CM_S_MAX',
      'UCRIT_BL_S_MEAN',
      'UCRIT_BL_S_MIN',
      'UCRIT_BL_S_MAX',
      'TEMP_C',
    ],
  },
  'in_situ_swimming_speed_database.csv': {
    type: 'in_situ_swimming',
    filename: 'in_situ_swimming_speed_database.csv',
    displayName: 'In Situ Swimming Speed',
    category: 'swimming',
    traitColumns: [
      'SPEED_CM_S_MEAN',
      'SPEED_CM_S_MIN',
      'SPEED_CM_S_MAX',
      'SPEED_BL_S_MEAN',
      'SPEED_BL_S_MIN',
      'SPEED_BL_S_MAX',
      'TEMP_C',
    ],
  },

  // Behavior databases
  'vertical_position_database.csv': {
    type: 'vertical_position',
    filename: 'vertical_position_database.csv',
    displayName: 'Vertical Position',
    category: 'behavior',
    traitColumns: [
      'DEPTH_M_MEAN',
      'DEPTH_M_MIN',
      'DEPTH_M_MAX',
      'DEPTH_LAYER',
      'TIME_OF_DAY',
    ],
  },
  'rafting_database.csv': {
    type: 'rafting',
    filename: 'rafting_database.csv',
    displayName: 'Rafting Behavior',
    category: 'behavior',
    traitColumns: ['FLOATSAM', 'STAGE', 'RAFTING_SIZE_MEAN', 'RAFTING_SIZE_MIN', 'RAFTING_SIZE_MAX'],
  },
};

/**
 * Get metadata for a database file.
 *
 * @param filename - Database filename
 * @returns DatabaseMetadata or undefined if not found
 */
export function getDatabaseMetadata(
  filename: string
): DatabaseMetadata | undefined {
  return DATABASE_METADATA[filename];
}

/**
 * Get the database type from a filename.
 *
 * @param filename - Database filename
 * @returns DatabaseType or 'unknown' if not found
 */
export function getDatabaseType(filename: string): DatabaseType {
  return DATABASE_METADATA[filename]?.type ?? 'unknown';
}

/**
 * Get all database filenames for a specific category.
 *
 * @param category - Database category
 * @returns Array of filenames in that category
 */
export function getDatabasesByCategory(category: DatabaseCategory): string[] {
  return Object.entries(DATABASE_METADATA)
    .filter(([, meta]) => meta.category === category)
    .map(([filename]) => filename);
}

/**
 * Get all known database filenames.
 *
 * @returns Array of all database filenames
 */
export function getAllDatabaseFilenames(): string[] {
  return Object.keys(DATABASE_METADATA);
}
