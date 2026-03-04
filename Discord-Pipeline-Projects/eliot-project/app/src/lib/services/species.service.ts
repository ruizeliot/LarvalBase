/**
 * Species service for data aggregation and API-ready responses.
 *
 * Provides functions to:
 * - Get species list (for species list API)
 * - Get individual species with computed trait statistics
 * - Get all species with taxonomy tree
 */

import { getOrLoadData, type LocationData } from '@/lib/data/data-repository';
import { computeTraitStatistics } from './statistics.service';
import type {
  Species,
  TraitData,
  TraitStatistics,
  SpeciesWithTraits,
} from '@/lib/types/species.types';
import type { TaxonomyNode } from '@/lib/types/taxonomy.types';

/**
 * Check if a species name is a genus-level or family-level identification.
 * These should not have individual species pages but remain in barplots/exports.
 * Examples: "Acanthocybium sp.", "Pomacentridae und.", "Gobiidae spp."
 */
export function isGenusOrFamilyLevelId(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.endsWith(' sp.') || trimmed.endsWith(' spp.') || trimmed.endsWith(' und.');
}

/**
 * Reference data for citations.
 */
export interface ReferenceData {
  source: string | null;
  doi: string | null;
}

/**
 * Extended species data including trait statistics, locations, and references.
 */
export interface SpeciesWithTraitsAndLocations {
  species: Species;
  traits: Map<string, TraitStatistics>;
  locations: LocationData[];
  references: ReferenceData[];
  fetchedAt: string;
}

/**
 * Get list of all species.
 * Returns basic species information without trait data.
 *
 * @returns Array of Species objects
 */
export async function getSpeciesList(): Promise<Species[]> {
  const data = await getOrLoadData();
  // Exclude genus/family level IDs — they should not have species pages
  return Array.from(data.species.values()).filter(
    (s) => !isGenusOrFamilyLevelId(s.validName)
  );
}

/**
 * Get a single species with computed trait statistics and location data.
 *
 * Aggregates all trait observations for the species and computes
 * statistics (mean, sd, min, max, n) for each trait type.
 * Also returns location data for GPS map display.
 *
 * @param speciesId - Species ID (slugified scientific name)
 * @returns SpeciesWithTraitsAndLocations or null if species not found
 */
export async function getSpeciesWithTraits(
  speciesId: string
): Promise<SpeciesWithTraitsAndLocations | null> {
  const data = await getOrLoadData();

  // Find species by ID
  const species = data.species.get(speciesId);
  if (!species) {
    console.warn(`[species.service] Species not found: ${speciesId}`);
    return null;
  }

  // Get all traits for this species
  const speciesTraits = data.traitsBySpecies.get(speciesId) || [];

  // Group traits by type for statistics computation
  const traitGroups = new Map<string, number[]>();
  for (const trait of speciesTraits) {
    if (trait.value !== null) {
      const existing = traitGroups.get(trait.traitType) || [];
      existing.push(trait.value);
      traitGroups.set(trait.traitType, existing);
    }
  }

  // Compute statistics for each trait group (base traits only, excluding _min/_max)
  const traitStats = new Map<string, TraitStatistics>();
  for (const [traitType, values] of traitGroups) {
    // Skip _min and _max entries - they'll be used to override range values
    if (traitType.endsWith('_min') || traitType.endsWith('_max')) {
      continue;
    }
    traitStats.set(traitType, computeTraitStatistics(values));
  }

  // Override min/max with dedicated _min/_max column values when available
  // These database columns store the actual measurement ranges, not statistical ranges
  for (const [traitType, stats] of traitStats) {
    const minTraitKey = `${traitType}_min`;
    const maxTraitKey = `${traitType}_max`;

    // Get all _min values for this trait
    const minValues = speciesTraits
      .filter(t => t.traitType === minTraitKey && t.value !== null)
      .map(t => t.value as number);

    // Get all _max values for this trait
    const maxValues = speciesTraits
      .filter(t => t.traitType === maxTraitKey && t.value !== null)
      .map(t => t.value as number);

    // Override min if dedicated min column exists
    if (minValues.length > 0) {
      stats.min = Math.min(...minValues);
    }

    // Override max if dedicated max column exists
    if (maxValues.length > 0) {
      stats.max = Math.max(...maxValues);
    }
  }

  // Get location data for GPS map
  const locations = data.locationsBySpecies.get(speciesId) || [];

  // Extract unique references from trait data
  const referenceSet = new Map<string, ReferenceData>();
  for (const trait of speciesTraits) {
    // Only include references that have at least source or doi
    if (trait.source || trait.doi) {
      const key = `${trait.source || ""}|${trait.doi || ""}`;
      if (!referenceSet.has(key)) {
        referenceSet.set(key, {
          source: trait.source,
          doi: trait.doi,
        });
      }
    }
  }
  const references = Array.from(referenceSet.values());

  return {
    species,
    traits: traitStats,
    locations,
    references,
    fetchedAt: data.fetchedAt.toISOString(),
  };
}

/**
 * Get all species with taxonomy tree and traits.
 * This is the main API response shape for the species list page.
 *
 * @returns Object with species array, taxonomy tree, traits map, and fetch timestamp
 */
export async function getAllSpeciesWithTaxonomy(): Promise<{
  species: Species[];
  taxonomy: TaxonomyNode;
  traitsBySpecies: Map<string, TraitData[]>;
  fetchedAt: Date;
}> {
  const data = await getOrLoadData();

  return {
    species: Array.from(data.species.values()),
    taxonomy: data.taxonomy,
    traitsBySpecies: data.traitsBySpecies,
    fetchedAt: data.fetchedAt,
  };
}

/**
 * Get species by taxonomy criteria.
 * Filters species by order, family, or genus.
 *
 * @param criteria - Filter criteria
 * @returns Array of matching Species
 */
export async function getSpeciesByTaxonomy(criteria: {
  order?: string;
  family?: string;
  genus?: string;
}): Promise<Species[]> {
  const data = await getOrLoadData();
  const allSpecies = Array.from(data.species.values());

  return allSpecies.filter((species) => {
    if (criteria.order && species.order !== criteria.order) return false;
    if (criteria.family && species.family !== criteria.family) return false;
    if (criteria.genus && species.genus !== criteria.genus) return false;
    return true;
  });
}

/**
 * Search species by name.
 * Matches against valid name and common name (case-insensitive).
 *
 * @param query - Search query
 * @param limit - Maximum number of results (default 20)
 * @returns Array of matching Species
 */
export async function searchSpecies(
  query: string,
  limit: number = 20
): Promise<Species[]> {
  const data = await getOrLoadData();
  const allSpecies = Array.from(data.species.values());
  const lowerQuery = query.toLowerCase();

  const matches = allSpecies.filter((species) => {
    const validNameMatch = species.validName.toLowerCase().includes(lowerQuery);
    const commonNameMatch = species.commonName
      ?.toLowerCase()
      .includes(lowerQuery);
    return validNameMatch || commonNameMatch;
  });

  return matches.slice(0, limit);
}

/**
 * Get species count by taxonomy level.
 * Returns count of species in each order, family, or genus.
 *
 * @param level - Taxonomy level to count by
 * @returns Map of taxonomy name to species count
 */
export async function getSpeciesCountByTaxonomy(
  level: 'order' | 'family' | 'genus'
): Promise<Map<string, number>> {
  const data = await getOrLoadData();
  const counts = new Map<string, number>();

  for (const species of data.species.values()) {
    const key = species[level];
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

/**
 * Get trait types available for a species.
 * Returns list of trait types that have data for the species.
 *
 * @param speciesId - Species ID
 * @returns Array of trait type names, or empty array if species not found
 */
export async function getSpeciesTraitTypes(
  speciesId: string
): Promise<string[]> {
  const data = await getOrLoadData();
  const speciesTraits = data.traitsBySpecies.get(speciesId) || [];

  // Get unique trait types
  const traitTypes = new Set<string>();
  for (const trait of speciesTraits) {
    traitTypes.add(trait.traitType);
  }

  return Array.from(traitTypes).sort();
}

/**
 * Get summary statistics for the entire dataset.
 *
 * @returns Object with counts and basic stats
 */
/**
 * Raw trait data for modal display.
 * Includes all original measurement fields, not aggregated.
 */
export interface RawTraitMeasurement {
  /** Mean value for this measurement */
  value: number | null;
  /** Unit of measurement */
  unit: string;
  /** Data source citation */
  source: string | null;
  /** DOI or URL link */
  doi: string | null;
  /** Trait type (e.g., "settlement_age") */
  traitType: string;
  /** Extended metadata */
  metadata?: {
    method?: string | null;
    origin?: string | null;
    temperatureMean?: number | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    gear?: string | null;
    location?: string | null;
    country?: string | null;
    remarks?: string | null;
    externalRef?: string | null;
    lengthType?: string | null;
    sampleSize?: number | null;
    rawFields?: Record<string, unknown>;
  };
}

/**
 * Get raw trait data for a species without aggregation.
 * Returns individual measurements for display in raw data modal.
 *
 * @param speciesId - Species ID (slugified scientific name)
 * @param traitType - Optional filter for specific trait type
 * @returns Array of raw trait measurements, or null if species not found
 */
export async function getRawTraitData(
  speciesId: string,
  traitType?: string
): Promise<RawTraitMeasurement[] | null> {
  const data = await getOrLoadData();

  // Verify species exists
  if (!data.species.has(speciesId)) {
    return null;
  }

  // Get all traits for this species (raw, not aggregated)
  const speciesTraits = data.traitsBySpecies.get(speciesId) || [];

  // Filter by trait type if specified
  const measurements = traitType
    ? speciesTraits.filter(t => t.traitType === traitType)
    : speciesTraits;

  // Map to RawTraitMeasurement format including metadata
  return measurements.map(trait => ({
    value: trait.value,
    unit: trait.unit,
    source: trait.source,
    doi: trait.doi,
    traitType: trait.traitType,
    metadata: trait.metadata,
  }));
}

export async function getDatasetSummary(): Promise<{
  speciesCount: number;
  speciesWithTraitsCount: number;
  totalTraitObservations: number;
  uniqueTraitTypes: number;
  orderCount: number;
  familyCount: number;
  genusCount: number;
  fetchedAt: Date;
}> {
  const data = await getOrLoadData();

  // Count unique trait types
  const allTraitTypes = new Set<string>();
  let totalObservations = 0;

  for (const traits of data.traitsBySpecies.values()) {
    for (const trait of traits) {
      allTraitTypes.add(trait.traitType);
      totalObservations++;
    }
  }

  // Count taxonomic groups
  const orders = new Set<string>();
  const families = new Set<string>();
  const genera = new Set<string>();

  for (const species of data.species.values()) {
    orders.add(species.order);
    families.add(species.family);
    genera.add(species.genus);
  }

  return {
    speciesCount: data.species.size,
    speciesWithTraitsCount: data.traitsBySpecies.size,
    totalTraitObservations: totalObservations,
    uniqueTraitTypes: allTraitTypes.size,
    orderCount: orders.size,
    familyCount: families.size,
    genusCount: genera.size,
    fetchedAt: data.fetchedAt,
  };
}
