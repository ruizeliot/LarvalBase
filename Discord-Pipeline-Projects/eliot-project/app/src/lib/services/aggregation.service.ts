/**
 * Aggregation service for computing taxonomy-level statistics.
 *
 * Computes genus, family, and order-level statistics for traits,
 * enabling comparative analysis on trait cards.
 *
 * Uses LRU caching to avoid recomputation for frequently accessed
 * taxonomy/trait combinations.
 */

import { LRUCache } from 'lru-cache';
import { mean } from 'simple-statistics';
import { getOrLoadData } from '@/lib/data/data-repository';
import { computeTraitStatistics } from '@/lib/services/statistics.service';
import type {
  TaxonomyStats,
  ComparisonStats,
  Species,
  TraitData,
  FamilyBarChartData,
  FamilyBarChartEntry,
} from '@/lib/types/species.types';

/**
 * LRU cache for taxonomy statistics.
 * Key format: `${level}:${name}:${traitType}`
 * Example: "family:Acanthuridae:settlement_age"
 */
const aggregationCache = new LRUCache<string, TaxonomyStats>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

/**
 * LRU cache for family bar chart data.
 * Key format: `familyChart:${familyName}:${traitType}`
 */
const familyChartCache = new LRUCache<string, FamilyBarChartData>({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 minutes
});

/**
 * Build cache key for taxonomy stats.
 */
function buildCacheKey(
  level: 'genus' | 'family' | 'order',
  name: string,
  traitType: string
): string {
  return `${level}:${name}:${traitType}`;
}

/**
 * Compute statistics for a specific taxonomy level and trait.
 *
 * Aggregates per-species means to ensure each species contributes
 * equally regardless of observation count.
 *
 * @param level - Taxonomy level (genus, family, or order)
 * @param name - Taxonomy name (e.g., "Acanthuridae")
 * @param traitType - Trait type to aggregate (e.g., "settlement_age")
 * @returns TaxonomyStats or null if no data found
 */
async function computeTaxonomyStats(
  level: 'genus' | 'family' | 'order',
  name: string,
  traitType: string
): Promise<TaxonomyStats | null> {
  const data = await getOrLoadData();

  // Find all species in this taxonomy group
  const speciesInGroup: Species[] = [];
  for (const species of data.species.values()) {
    if (species[level] === name) {
      speciesInGroup.push(species);
    }
  }

  if (speciesInGroup.length === 0) {
    return null;
  }

  // Aggregate per-species means (each species contributes one value)
  // This ensures equal weighting regardless of observation count
  const speciesMeans: number[] = [];

  for (const species of speciesInGroup) {
    const traits = data.traitsBySpecies.get(species.id) || [];
    const values = traits
      .filter(
        (t: TraitData) =>
          t.traitType === traitType && t.value !== null && t.value !== undefined
      )
      .map((t: TraitData) => t.value as number);

    if (values.length > 0) {
      speciesMeans.push(mean(values));
    }
  }

  // If no species have data for this trait, return null
  if (speciesMeans.length === 0) {
    return null;
  }

  // Compute statistics across species means
  const stats = computeTraitStatistics(speciesMeans);

  return {
    level,
    name,
    traitType,
    stats,
    speciesCount: speciesMeans.length,
  };
}

/**
 * Get taxonomy statistics with caching.
 *
 * @param level - Taxonomy level (genus, family, or order)
 * @param name - Taxonomy name (e.g., "Acanthuridae")
 * @param traitType - Trait type to aggregate (e.g., "settlement_age")
 * @returns TaxonomyStats or null if no data found
 */
export async function getTaxonomyStats(
  level: 'genus' | 'family' | 'order',
  name: string,
  traitType: string
): Promise<TaxonomyStats | null> {
  const cacheKey = buildCacheKey(level, name, traitType);

  // Check cache first
  const cached = aggregationCache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[aggregation] Cache HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`[aggregation] Cache MISS: ${cacheKey}`);

  // Compute on cache miss
  const result = await computeTaxonomyStats(level, name, traitType);

  // Store in cache (even null results to avoid recomputation)
  if (result !== null) {
    aggregationCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Get comparison statistics for a species and trait.
 *
 * Returns aggregated statistics for the species' genus, family, and order.
 *
 * @param speciesId - Species ID (slug form, e.g., "acanthurus-triostegus")
 * @param traitType - Trait type to compare (e.g., "settlement_age")
 * @returns ComparisonStats with genus/family/order aggregations, or null if species not found
 */
export async function getComparisonStats(
  speciesId: string,
  traitType: string
): Promise<ComparisonStats | null> {
  const data = await getOrLoadData();

  // Find the species
  const species = data.species.get(speciesId);
  if (!species) {
    return null;
  }

  // Fetch all three taxonomy levels in parallel
  const [genus, family, order] = await Promise.all([
    getTaxonomyStats('genus', species.genus, traitType),
    getTaxonomyStats('family', species.family, traitType),
    getTaxonomyStats('order', species.order, traitType),
  ]);

  return {
    genus,
    family,
    order,
  };
}

/**
 * Get per-species means for all species in a family for bar chart display.
 *
 * @param familyName - Family name (e.g., "Acanthuridae")
 * @param traitType - Trait type to aggregate (e.g., "settlement_age")
 * @returns FamilyBarChartData with species means, or null if no data found
 */
export async function getFamilyBarChartData(
  familyName: string,
  traitType: string
): Promise<FamilyBarChartData | null> {
  const cacheKey = `familyChart:${familyName}:${traitType}`;

  const cached = familyChartCache.get(cacheKey);
  if (cached) {
    console.log(`[aggregation] Family chart cache HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`[aggregation] Family chart cache MISS: ${cacheKey}`);

  const data = await getOrLoadData();

  // Find all species in this family
  const speciesInFamily: Species[] = [];
  for (const species of data.species.values()) {
    if (species.family === familyName) {
      speciesInFamily.push(species);
    }
  }

  if (speciesInFamily.length === 0) {
    return null;
  }

  // Compute per-species means
  const speciesData: FamilyBarChartEntry[] = [];

  for (const species of speciesInFamily) {
    const traits = data.traitsBySpecies.get(species.id) || [];
    const values = traits
      .filter(
        (t: TraitData) =>
          t.traitType === traitType && t.value !== null && t.value !== undefined
      )
      .map((t: TraitData) => t.value as number);

    if (values.length > 0) {
      speciesData.push({
        speciesId: species.id,
        speciesName: species.validName,
        meanValue: mean(values),
      });
    }
  }

  if (speciesData.length === 0) {
    return null;
  }

  const result: FamilyBarChartData = {
    familyName,
    traitType,
    species: speciesData, // Sorting done in component per CHART-02
  };

  familyChartCache.set(cacheKey, result);
  return result;
}

/**
 * Get per-species means for all species in a genus for bar chart display.
 *
 * @param genusName - Genus name (e.g., "Acanthurus")
 * @param traitType - Trait type to aggregate (e.g., "settlement_age")
 * @returns FamilyBarChartData (reusing type) with species means, or null if no data found
 */
export async function getGenusBarChartData(
  genusName: string,
  traitType: string
): Promise<FamilyBarChartData | null> {
  const cacheKey = `genusChart:${genusName}:${traitType}`;

  const cached = familyChartCache.get(cacheKey);
  if (cached) {
    console.log(`[aggregation] Genus chart cache HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`[aggregation] Genus chart cache MISS: ${cacheKey}`);

  const data = await getOrLoadData();

  // Find all species in this genus
  const speciesInGenus: Species[] = [];
  for (const species of data.species.values()) {
    if (species.genus === genusName) {
      speciesInGenus.push(species);
    }
  }

  if (speciesInGenus.length === 0) {
    return null;
  }

  // Compute per-species means
  const speciesData: FamilyBarChartEntry[] = [];

  for (const species of speciesInGenus) {
    const traits = data.traitsBySpecies.get(species.id) || [];
    const values = traits
      .filter(
        (t: TraitData) =>
          t.traitType === traitType && t.value !== null && t.value !== undefined
      )
      .map((t: TraitData) => t.value as number);

    if (values.length > 0) {
      speciesData.push({
        speciesId: species.id,
        speciesName: species.validName,
        meanValue: mean(values),
      });
    }
  }

  if (speciesData.length === 0) {
    return null;
  }

  const result: FamilyBarChartData = {
    familyName: genusName, // Reusing field for genus name
    traitType,
    species: speciesData,
  };

  familyChartCache.set(cacheKey, result);
  return result;
}

/**
 * Get genus-averaged bar chart data for a family.
 *
 * Groups all species in the family by genus, computes the average
 * per genus, and returns one bar per genus. Used when a family has
 * >20 species to keep the chart readable.
 *
 * @param familyName - Family name (e.g., "Pomacentridae")
 * @param traitType - Trait type to aggregate (e.g., "settlement_age")
 * @returns FamilyBarChartData with genus averages, or null if no data found
 */
export async function getGenusAveragedFamilyData(
  familyName: string,
  traitType: string
): Promise<FamilyBarChartData | null> {
  const cacheKey = `genusAvgFamily:${familyName}:${traitType}`;

  const cached = familyChartCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await getOrLoadData();

  // Find all species in this family
  const speciesInFamily: Species[] = [];
  for (const species of data.species.values()) {
    if (species.family === familyName) {
      speciesInFamily.push(species);
    }
  }

  if (speciesInFamily.length === 0) {
    return null;
  }

  // Group species by genus and compute per-species means first
  const genusMeans = new Map<string, number[]>();

  for (const species of speciesInFamily) {
    const traits = data.traitsBySpecies.get(species.id) || [];
    const values = traits
      .filter(
        (t: TraitData) =>
          t.traitType === traitType && t.value !== null && t.value !== undefined
      )
      .map((t: TraitData) => t.value as number);

    if (values.length > 0) {
      const speciesMean = mean(values);
      const existing = genusMeans.get(species.genus) || [];
      existing.push(speciesMean);
      genusMeans.set(species.genus, existing);
    }
  }

  if (genusMeans.size === 0) {
    return null;
  }

  // Compute genus averages
  const genusData: FamilyBarChartEntry[] = [];
  for (const [genusName, speciesMeans] of genusMeans) {
    genusData.push({
      speciesId: `genus:${genusName}`,
      speciesName: genusName,
      meanValue: mean(speciesMeans),
    });
  }

  const result: FamilyBarChartData = {
    familyName,
    traitType,
    species: genusData,
  };

  familyChartCache.set(cacheKey, result);
  return result;
}

/**
 * Clear the aggregation cache.
 *
 * Use when underlying data changes and cached aggregations
 * may be stale.
 */
export function clearAggregationCache(): void {
  console.log('[aggregation] Clearing cache');
  aggregationCache.clear();
  familyChartCache.clear();
}
