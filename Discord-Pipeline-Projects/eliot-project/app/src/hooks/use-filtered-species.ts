import { useMemo } from "react";
import type { TraitData } from "@/lib/types/species.types";

interface SpeciesItem {
  id: string;
  scientificName: string;
  commonName: string | null;
  order: string;
  family: string;
  genus: string;
}

interface UseFilteredSpeciesOptions {
  species: SpeciesItem[];
  searchTerm: string;
  selectedTraits: Set<string>;
  traitsBySpecies: Map<string, TraitData[]>;
}

/**
 * Filter species by search term and selected traits.
 * Search matches against scientific name and common name (case-insensitive).
 * Trait filter uses OR logic - shows species with ANY selected trait type.
 *
 * NOTE: This hook is used by AppSidebar for tree/count filtering.
 * SpeciesSearch does its own filtering via cmdk internally.
 */
export function useFilteredSpecies({
  species,
  searchTerm,
  selectedTraits,
  traitsBySpecies,
}: UseFilteredSpeciesOptions): SpeciesItem[] {
  return useMemo(() => {
    let filtered = species;

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((sp) => {
        const scientificMatch = sp.scientificName.toLowerCase().includes(lowerSearch);
        const commonMatch = sp.commonName?.toLowerCase().includes(lowerSearch);
        return scientificMatch || commonMatch;
      });
    }

    // Apply trait filter (AND logic - species must have ALL selected trait types)
    if (selectedTraits.size > 0) {
      filtered = filtered.filter((sp) => {
        const speciesTraits = traitsBySpecies.get(sp.id) || [];
        const speciesTraitTypes = new Set(speciesTraits.map((t) => t.traitType));
        // Check if species has ALL selected trait types
        for (const trait of selectedTraits) {
          if (!speciesTraitTypes.has(trait)) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [species, searchTerm, selectedTraits, traitsBySpecies]);
}
