"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SpeciesSearch } from "./species-search";
import { TaxonomyTree } from "./taxonomy-tree";
import { TraitFilters } from "./trait-filters";
import { SpeciesCount } from "./species-count";
import { useSpeciesData } from "@/hooks/use-species-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFilteredSpecies } from "@/hooks/use-filtered-species";
import type { TaxonomyNodeJSON } from "@/lib/types/taxonomy.types";

/**
 * Build a TaxonomyNodeJSON tree from a flat species list.
 * Used to display a filtered taxonomy when trait/search filters are active.
 */
function buildTaxonomyFromSpecies(
  speciesList: { scientificName: string; order: string; family: string; genus: string }[]
): TaxonomyNodeJSON {
  const root: TaxonomyNodeJSON = {
    name: 'All Species',
    level: 'root',
    children: [],
    speciesCount: speciesList.length,
  };

  // Build hierarchy: family -> genus -> species (no order level)
  const familyMap = new Map<string, TaxonomyNodeJSON>();

  for (const sp of speciesList) {
    // Get or create family directly under root
    let familyNode = familyMap.get(sp.family);
    if (!familyNode) {
      familyNode = { name: sp.family, level: 'family', children: [], speciesCount: 0 };
      familyMap.set(sp.family, familyNode);
      root.children.push(familyNode);
    }
    familyNode.speciesCount++;

    // Get or create genus under family
    let genusNode = familyNode.children.find((c) => c.name === sp.genus);
    if (!genusNode) {
      genusNode = { name: sp.genus, level: 'genus', children: [], speciesCount: 0 };
      familyNode.children.push(genusNode);
    }
    genusNode.speciesCount++;

    // Add species leaf
    genusNode.children.push({
      name: sp.scientificName,
      level: 'species',
      children: [],
      speciesCount: 1,
    });
  }

  // Sort families by decreasing species count, then alphabetically
  root.children.sort((a, b) => {
    const diff = b.speciesCount - a.speciesCount;
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  return root;
}

interface AppSidebarProps {
  onSelectSpecies?: (species: { id: string; scientificName: string }) => void;
  /** Notify parent when trait filters change the set of visible species names. null = no filter active. */
  onFilteredSpeciesChange?: (names: Set<string> | null) => void;
  /** External filter from map province click. When set, only show species in this set. */
  mapFilteredSpecies?: Set<string> | null;
}

/**
 * Main application sidebar with search, taxonomy tree, and trait filters.
 * Manages filter state and species selection.
 *
 * Data flow:
 * - useSpeciesData provides species, taxonomy, traitsBySpecies, and availableTraitTypes
 * - useFilteredSpecies applies search + trait filters for tree/count display
 * - SpeciesSearch receives ALL species (filters internally via cmdk)
 * - Trait filter uses OR logic: species with ANY selected trait type shown
 */
export function AppSidebar({ onSelectSpecies, onFilteredSpeciesChange, mapFilteredSpecies }: AppSidebarProps) {
  // Fetch species and taxonomy data
  const {
    species,
    taxonomy,
    traitsBySpecies,
    availableTraitTypes,
    isLoading,
    error,
  } = useSpeciesData();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set());
  const [selectedEcosystems, setSelectedEcosystems] = useState<Set<string>>(new Set());
  const [selectedHabitats, setSelectedHabitats] = useState<Set<string>>(new Set());
  const [ecologySpeciesMap, setEcologySpeciesMap] = useState<Set<string> | null>(null);
  const debouncedSearch = useDebouncedValue(searchTerm, 200);

  // Fetch ecology filter results when ecosystem/habitat selections change
  useEffect(() => {
    if (selectedEcosystems.size === 0 && selectedHabitats.size === 0) {
      setEcologySpeciesMap(null);
      return;
    }

    const params = new URLSearchParams();
    if (selectedEcosystems.size > 0) {
      params.set('ecosystem', [...selectedEcosystems].join(','));
    }
    if (selectedHabitats.size > 0) {
      params.set('habitat', [...selectedHabitats].join(','));
    }

    let cancelled = false;
    fetch(`/api/ecology?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.species) {
          setEcologySpeciesMap(new Set(data.species));
        }
      })
      .catch(console.error);

    return () => { cancelled = true; };
  }, [selectedEcosystems, selectedHabitats]);

  // Filter species using the dedicated hook (for tree/count display)
  // Single search bar searches within filtered results when filters are active
  const traitFilteredSpecies = useFilteredSpecies({
    species,
    searchTerm: debouncedSearch,
    selectedTraits,
    traitsBySpecies,
  });

  // Apply ecology filter
  const ecologyFilteredSpecies = useMemo(() => {
    if (!ecologySpeciesMap) return traitFilteredSpecies;
    return traitFilteredSpecies.filter(sp => ecologySpeciesMap.has(sp.scientificName));
  }, [traitFilteredSpecies, ecologySpeciesMap]);

  // Apply map province filter on top of trait/search/ecology filters
  const filteredSpecies = useMemo(() => {
    if (!mapFilteredSpecies) return ecologyFilteredSpecies;
    return ecologyFilteredSpecies.filter(sp => mapFilteredSpecies.has(sp.scientificName));
  }, [ecologyFilteredSpecies, mapFilteredSpecies]);

  // Build filtered taxonomy tree from filtered species
  const filteredTaxonomy = useMemo((): TaxonomyNodeJSON | null => {
    if (!taxonomy) return null;
    // If no filters are active, use the full taxonomy
    if (selectedTraits.size === 0 && !debouncedSearch.trim() && !mapFilteredSpecies && !ecologySpeciesMap) {
      return taxonomy;
    }
    // Build taxonomy from filtered species
    return buildTaxonomyFromSpecies(filteredSpecies);
  }, [taxonomy, filteredSpecies, selectedTraits, debouncedSearch, mapFilteredSpecies, ecologySpeciesMap]);

  // Notify parent when trait/ecology filter changes the visible species set
  useEffect(() => {
    if (!onFilteredSpeciesChange) return;
    if (selectedTraits.size === 0 && selectedEcosystems.size === 0 && selectedHabitats.size === 0) {
      onFilteredSpeciesChange(null);
    } else {
      onFilteredSpeciesChange(new Set(filteredSpecies.map((sp) => sp.scientificName)));
    }
  }, [filteredSpecies, selectedTraits, selectedEcosystems, selectedHabitats, onFilteredSpeciesChange]);

  // Handlers
  const handleTraitToggle = useCallback((trait: string) => {
    setSelectedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(trait)) {
        next.delete(trait);
      } else {
        next.add(trait);
      }
      return next;
    });
  }, []);

  const handleClearTraits = useCallback(() => {
    setSelectedTraits(new Set());
  }, []);

  const handleSelectFromSearch = useCallback(
    (sp: { id: string; scientificName: string }) => {
      onSelectSpecies?.(sp);
    },
    [onSelectSpecies]
  );

  const handleSelectFromTree = useCallback(
    (speciesName: string) => {
      // Find species by name
      const found = species.find((sp) => sp.scientificName === speciesName);
      if (found) {
        onSelectSpecies?.({
          id: found.id,
          scientificName: found.scientificName,
        });
      }
    },
    [species, onSelectSpecies]
  );

  // Loading state
  if (isLoading) {
    return (
      <Sidebar className="border-r">
        <SidebarContent className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading data...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Error state
  if (error) {
    return (
      <Sidebar className="border-r">
        <SidebarContent className="flex items-center justify-center h-full p-4">
          <div className="text-sm text-destructive text-center">
            <p className="font-medium">Error loading data</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r">
      {/* Search at top - receives ALL species, filters internally */}
      <SidebarHeader className="p-0">
        <SpeciesSearch
          species={species}
          onSelect={handleSelectFromSearch}
          onSearchChange={setSearchTerm}
        />
      </SidebarHeader>

      {/* Scrollable content */}
      <SidebarContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {/* Taxonomy Tree */}
          <SidebarGroup>
            <SidebarGroupLabel>Available Species</SidebarGroupLabel>
            <SidebarGroupContent>
              <TaxonomyTree
                data={filteredTaxonomy}
                onSelectSpecies={handleSelectFromTree}
                height={250}
              />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Ecology Filters */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm text-white font-semibold text-center justify-center px-2 py-1.5 mx-2 rounded bg-blue-600/80">Filter by adult ecology or location (map)</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-1">
                {(selectedEcosystems.size > 0 || selectedHabitats.size > 0) && (
                  <div className="flex items-center justify-end px-2 py-1">
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setSelectedEcosystems(new Set()); setSelectedHabitats(new Set()); }}
                    >
                      Clear ({selectedEcosystems.size + selectedHabitats.size})
                    </button>
                  </div>
                )}
                {/* Ecosystem filter */}
                <div className="px-2 py-1.5 text-sm">Ecosystem</div>
                <div className="pl-2 space-y-0.5">
                  {['Marine', 'Euryhaline', 'Freshwater'].map(eco => {
                    const displayLabel = eco === 'Freshwater' ? 'Freshwater (marine larvae)' : eco;
                    return (
                      <label key={eco} className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent/50 rounded cursor-pointer transition-colors">
                        <Checkbox
                          checked={selectedEcosystems.has(eco)}
                          onCheckedChange={() => {
                            setSelectedEcosystems(prev => {
                              const next = new Set(prev);
                              if (next.has(eco)) next.delete(eco); else next.add(eco);
                              return next;
                            });
                          }}
                        />
                        <span className="text-muted-foreground">{displayLabel}</span>
                      </label>
                    );
                  })}
                </div>
                {/* Habitat filter */}
                <div className="px-2 py-1.5 text-sm">Habitat</div>
                <div className="pl-2 space-y-0.5">
                  {['Benthic', 'Pelagic'].map(hab => {
                    const displayLabel = hab === 'Benthic' ? 'Benthic and/or demersal' : 'Pelagic (offshore)';
                    return (
                      <label key={hab} className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent/50 rounded cursor-pointer transition-colors">
                        <Checkbox
                          checked={selectedHabitats.has(hab)}
                          onCheckedChange={() => {
                            setSelectedHabitats(prev => {
                              const next = new Set(prev);
                              if (next.has(hab)) next.delete(hab); else next.add(hab);
                              return next;
                            });
                          }}
                        />
                        <span className="text-muted-foreground">{displayLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Trait Filters - uses availableTraitTypes from useSpeciesData */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm text-white font-semibold text-center justify-center px-2 py-1.5 mx-2 rounded bg-blue-600/80">Filter by dispersal traits availability</SidebarGroupLabel>
            <SidebarGroupContent>
              <TraitFilters
                selectedTraits={selectedTraits}
                availableTraits={availableTraitTypes}
                onTraitToggle={handleTraitToggle}
                onClearAll={handleClearTraits}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* Species count at bottom */}
      <SidebarFooter className="p-2 space-y-2 border-t">
        <SpeciesCount total={species.length} filtered={filteredSpecies.length} />
      </SidebarFooter>
    </Sidebar>
  );
}
