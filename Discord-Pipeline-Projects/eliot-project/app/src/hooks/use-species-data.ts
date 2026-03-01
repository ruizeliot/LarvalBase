"use client";

import { useState, useEffect } from "react";
import type { TaxonomyNodeJSON } from "@/lib/types/taxonomy.types";
import type { TraitData } from "@/lib/types/species.types";

interface SpeciesItem {
  id: string;
  scientificName: string;
  commonName: string | null;
  order: string;
  family: string;
  genus: string;
}

interface ApiSpeciesItem {
  id: string;
  validName?: string;
  scientificName?: string;
  commonName: string | null;
  order: string;
  family: string;
  genus: string;
  traits?: TraitData[];
  hasImages?: boolean;
  hasImagesSure?: boolean;
  hasImagesUnsure?: boolean;
}

interface SpeciesDataState {
  species: SpeciesItem[];
  taxonomy: TaxonomyNodeJSON | null;
  traitsBySpecies: Map<string, TraitData[]>;
  availableTraitTypes: Set<string>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches species list, taxonomy tree, and trait data from API.
 * Data is loaded once on mount and cached in state.
 * Derives availableTraitTypes from traitsBySpecies for filter UI.
 */
export function useSpeciesData(): SpeciesDataState {
  const [state, setState] = useState<SpeciesDataState>({
    species: [],
    taxonomy: null,
    traitsBySpecies: new Map(),
    availableTraitTypes: new Set(),
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch species and taxonomy in parallel
        const [speciesRes, taxonomyRes] = await Promise.all([
          fetch("/api/species"),
          fetch("/api/taxonomy"),
        ]);

        if (!speciesRes.ok) throw new Error("Failed to fetch species");
        if (!taxonomyRes.ok) throw new Error("Failed to fetch taxonomy");

        const speciesData = await speciesRes.json();
        const taxonomyData = await taxonomyRes.json();

        // Build traitsBySpecies map from species data
        // The API returns species with their traits included
        const traitsBySpecies = new Map<string, TraitData[]>();
        const traitTypes = new Set<string>();

        // Include ALL species — don't filter by traits/images
        let anyHasImages = false;
        for (const sp of speciesData.species as ApiSpeciesItem[]) {
          const traits: TraitData[] = [];
          if (sp.traits && sp.traits.length > 0) {
            traits.push(...sp.traits);
            for (const trait of sp.traits) {
              traitTypes.add(trait.traitType);
            }
          }
          // Add virtual "has_images" trait for species with photos
          if (sp.hasImages) {
            traits.push({ traitType: 'has_images', value: 1, unit: '', source: null, doi: null });
            anyHasImages = true;
          }
          if (sp.hasImagesSure) {
            traits.push({ traitType: 'has_images_sure', value: 1, unit: '', source: null, doi: null });
          }
          if (sp.hasImagesUnsure) {
            traits.push({ traitType: 'has_images_unsure', value: 1, unit: '', source: null, doi: null });
          }
          if (traits.length > 0) {
            traitsBySpecies.set(sp.id, traits);
          }
        }
        if (anyHasImages) {
          traitTypes.add('has_images');
          traitTypes.add('has_images_sure');
          traitTypes.add('has_images_unsure');
        }

        const allSpecies = speciesData.species as ApiSpeciesItem[];

        setState({
          species: allSpecies.map((sp) => ({
            id: sp.id,
            scientificName: sp.validName || sp.scientificName || "",
            commonName: sp.commonName,
            order: sp.order,
            family: sp.family,
            genus: sp.genus,
          })),
          taxonomy: taxonomyData.taxonomy,
          traitsBySpecies,
          availableTraitTypes: traitTypes,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load data",
        }));
      }
    }

    fetchData();
  }, []);

  return state;
}
