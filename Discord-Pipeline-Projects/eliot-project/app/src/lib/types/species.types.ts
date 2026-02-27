/**
 * Domain models for species and trait data.
 *
 * These types represent the processed/aggregated view of the data,
 * separate from the raw CSV row types.
 */

/**
 * Represents a unique marine fish species.
 * This is the domain model, not the raw CSV structure.
 */
export interface Species {
  /** Unique identifier (derived from scientific name, slugified) */
  id: string;

  /** Valid scientific name (e.g., "Acanthurus triostegus") */
  validName: string;

  /** Common name if available (e.g., "Convict surgeonfish") */
  commonName: string | null;

  /** Taxonomic order (e.g., "Perciformes") */
  order: string;

  /** Taxonomic family (e.g., "Acanthuridae") */
  family: string;

  /** Taxonomic genus (e.g., "Acanthurus") */
  genus: string;
}

/**
 * A single trait measurement/observation for a species.
 * Multiple TraitData entries can exist for the same species and trait type.
 */
export interface TraitData {
  /** Type of trait (e.g., "egg_diameter", "larval_growth_rate") */
  traitType: string;

  /** Measured value, null if data was "NA" */
  value: number | null;

  /** Unit of measurement (e.g., "mm", "days", "mm/day") */
  unit: string;

  /** Original data source citation */
  source: string | null;

  /** DOI reference if available */
  doi: string | null;

  /** Extended metadata fields */
  metadata?: TraitMetadata;
}

/**
 * Extended metadata for trait measurements.
 * Common fields across multiple database types.
 */
export interface TraitMetadata {
  /** Sampling/measurement method */
  method?: string | null;
  /** Origin of sample (Wild/Reared) */
  origin?: string | null;
  /** Mean temperature during measurement */
  temperatureMean?: number | null;
  /** Minimum temperature */
  temperatureMin?: number | null;
  /** Maximum temperature */
  temperatureMax?: number | null;
  /** Sampling gear used */
  gear?: string | null;
  /** Geographic location */
  location?: string | null;
  /** Country */
  country?: string | null;
  /** Remarks/notes */
  remarks?: string | null;
  /** External reference ID */
  externalRef?: string | null;
  /** Length type (SL, TL, etc.) */
  lengthType?: string | null;
  /** Sample size */
  sampleSize?: number | null;
  /** Minimum value from _MIN column */
  minValue?: number | null;
  /** Maximum value from _MAX column */
  maxValue?: number | null;
  /** Confidence value from _CONF column */
  confValue?: number | null;
  /** Confidence type from _CONF_TYPE column (e.g., "SD", "SE", "CI") */
  confType?: string | null;
}

/**
 * Computed statistics for a specific trait across all observations.
 * Used for summary views and comparisons.
 */
export interface TraitStatistics {
  /** Arithmetic mean of valid values, null if no valid values */
  mean: number | null;

  /** Sample standard deviation, null if fewer than 2 values */
  sd: number | null;

  /** Minimum value, null if no valid values */
  min: number | null;

  /** Maximum value, null if no valid values */
  max: number | null;

  /** Number of valid (non-null) observations */
  n: number;

  /** Number of missing/NA observations */
  missingCount: number;
}

/**
 * Aggregated statistics for a taxonomy level (genus, family, or order).
 * Used for comparative analysis on trait cards.
 */
export interface TaxonomyStats {
  /** Taxonomy level */
  level: 'genus' | 'family' | 'order';

  /** Taxonomy name (e.g., "Acanthuridae" for family) */
  name: string;

  /** Trait type this aggregation is for */
  traitType: string;

  /** Computed statistics across species in this taxonomy group */
  stats: TraitStatistics;

  /** Number of species contributing to this aggregation */
  speciesCount: number;
}

/**
 * Comparison stats for all three taxonomy levels.
 * Returned by aggregation service for trait card display.
 */
export interface ComparisonStats {
  /** Genus-level aggregation */
  genus: TaxonomyStats | null;

  /** Family-level aggregation */
  family: TaxonomyStats | null;

  /** Order-level aggregation */
  order: TaxonomyStats | null;
}

/**
 * Single species entry in family bar chart data.
 */
export interface FamilyBarChartEntry {
  /** Species ID (slug form) */
  speciesId: string;

  /** Species valid name (e.g., "Acanthurus triostegus") */
  speciesName: string;

  /** Mean value for this trait */
  meanValue: number;
}

/**
 * Data structure for family/genus bar chart display.
 * Contains all species in a family/genus with their mean values for a trait.
 */
export interface FamilyBarChartData {
  /** Family or genus name */
  familyName: string;

  /** Trait type (e.g., "settlement_age") */
  traitType: string;

  /** Per-species mean values, unsorted (sorting done in component) */
  species: FamilyBarChartEntry[];

  /** Comparison type: 'family' or 'genus' (from API) */
  comparisonType?: 'family' | 'genus';

  /** Taxonomy name (family or genus name, from API) */
  taxonomyName?: string;
}

/**
 * Complete species profile with aggregated trait statistics.
 * This is the main response type for species detail views.
 */
export interface SpeciesWithTraits {
  /** Base species information */
  species: Species;

  /** Map of trait type to computed statistics */
  traits: Map<string, TraitStatistics>;

  /** ISO timestamp when data was fetched */
  fetchedAt: string;
}

/**
 * API response for species list endpoint.
 */
export interface SpeciesListResponse {
  /** Array of species (basic info only) */
  species: Species[];

  /** Total count of species */
  count: number;

  /** ISO timestamp when data was fetched */
  fetchedAt: string;
}

/**
 * API response for single species detail endpoint.
 */
export interface SpeciesDetailResponse {
  /** Species with full trait statistics */
  species: SpeciesWithTraits;

  /** ISO timestamp when data was fetched */
  fetchedAt: string;
}
