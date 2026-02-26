"use client";

import { useState, useCallback, useMemo } from "react";
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
import { SpeciesSearch } from "./species-search";
import { TaxonomyTree } from "./taxonomy-tree";
import { TraitFilters } from "./trait-filters";
import { SpeciesCount } from "./species-count";
import { useSpeciesData } from "@/hooks/use-species-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFilteredSpecies } from "@/hooks/use-filtered-species";
import { Input } from "@/components/ui/input";

interface AppSidebarProps {
  onSelectSpecies?: (species: { id: string; scientificName: string }) => void;
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
export function AppSidebar({ onSelectSpecies }: AppSidebarProps) {
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
  const [filteredSearchTerm, setFilteredSearchTerm] = useState("");
  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const debouncedFilteredSearch = useDebouncedValue(filteredSearchTerm, 200);

  // Filter species using the dedicated hook (for tree/count display)
  const filteredSpecies = useFilteredSpecies({
    species,
    searchTerm: debouncedSearch,
    selectedTraits,
    traitsBySpecies,
  });

  // Apply second search bar (searches within filtered results)
  const displayedSpecies = useMemo(() => {
    if (!debouncedFilteredSearch.trim()) return filteredSpecies;
    const lower = debouncedFilteredSearch.toLowerCase();
    return filteredSpecies.filter((sp) => {
      const scientificMatch = sp.scientificName.toLowerCase().includes(lower);
      const commonMatch = sp.commonName?.toLowerCase().includes(lower);
      return scientificMatch || commonMatch;
    });
  }, [filteredSpecies, debouncedFilteredSearch]);

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
      <Sidebar collapsible="none" className="border-r">
        <SidebarContent className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading data...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Error state
  if (error) {
    return (
      <Sidebar collapsible="none" className="border-r">
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
    <Sidebar collapsible="none" className="border-r">
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
                data={taxonomy}
                onSelectSpecies={handleSelectFromTree}
                height={250}
              />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Trait Filters - uses availableTraitTypes from useSpeciesData */}
          <SidebarGroup>
            <SidebarGroupLabel>Traits</SidebarGroupLabel>
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

      {/* Filtered search, species count and export at bottom */}
      <SidebarFooter className="p-2 space-y-2 border-t">
        <Input
          placeholder="Search filtered species..."
          value={filteredSearchTerm}
          onChange={(e) => setFilteredSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
        <SpeciesCount total={species.length} filtered={displayedSpecies.length} />
      </SidebarFooter>
    </Sidebar>
  );
}
