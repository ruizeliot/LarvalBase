"use client";

import { useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface SpeciesItem {
  id: string;
  scientificName: string;
  commonName: string | null;
  family: string;
}

interface SpeciesSearchProps {
  /** All species to search through (filtering handled by cmdk) */
  species: SpeciesItem[];
  onSelect: (species: SpeciesItem) => void;
  onSearchChange?: (search: string) => void;
}

/**
 * Species search with autocomplete.
 * Shows species name + family as user types.
 * Results appear after 200ms debounce.
 *
 * NOTE: This component receives ALL species and filters internally via cmdk.
 * AppSidebar filters separately for tree/count display using useFilteredSpecies.
 */
export function SpeciesSearch({
  species,
  onSelect,
  onSearchChange,
}: SpeciesSearchProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  // Filter species based on debounced search
  const filteredSpecies = debouncedSearch.trim()
    ? species.filter((sp) => {
        const lowerSearch = debouncedSearch.toLowerCase();
        const nameMatch = sp.scientificName.toLowerCase().includes(lowerSearch);
        const commonMatch = sp.commonName?.toLowerCase().includes(lowerSearch);
        return nameMatch || commonMatch;
      })
    : [];

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  return (
    <Command shouldFilter={false} className="border-b">
      <div className="flex items-center border-b px-3">
        <CommandInput
          placeholder="Search species..."
          value={search}
          onValueChange={handleSearchChange}
          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <CommandList className="max-h-64 overflow-auto">
        {debouncedSearch.trim() && filteredSpecies.length === 0 && (
          <CommandEmpty>No species found.</CommandEmpty>
        )}
        {filteredSpecies.length > 0 && (
          <CommandGroup heading={`${filteredSpecies.length} results`}>
            {filteredSpecies.slice(0, 50).map((sp) => (
              <CommandItem
                key={sp.id}
                value={sp.id}
                onSelect={() => onSelect(sp)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium italic">{sp.scientificName}</span>
                <span className="text-xs text-muted-foreground">
                  Family: {sp.family}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!debouncedSearch.trim() && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type to search species...
          </div>
        )}
      </CommandList>
    </Command>
  );
}
