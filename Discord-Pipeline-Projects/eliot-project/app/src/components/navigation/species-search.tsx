"use client";

import { useState, useEffect } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface SpeciesItem {
  id: string;
  scientificName: string;
  commonName: string | null;
  allCommonNames?: string[];
  family: string;
}

interface SynonymMatch {
  synonym: string;
  validName: string;
  authority: string;
}

interface SpeciesSearchProps {
  species: SpeciesItem[];
  onSelect: (species: SpeciesItem) => void;
  onSearchChange?: (search: string) => void;
}

/**
 * Species search with autocomplete and synonym support.
 * Searches both Latin names AND common names simultaneously.
 */
export function SpeciesSearch({
  species,
  onSelect,
  onSearchChange,
}: SpeciesSearchProps) {
  const [search, setSearch] = useState("");
  const [searchLatin, setSearchLatin] = useState(true);
  const [searchCommon, setSearchCommon] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 200);
  const [synonymMatches, setSynonymMatches] = useState<SynonymMatch[]>([]);

  // Fetch synonym matches — only when Latin names search is active
  // (synonyms are ORIGINAL_NAME → VALID_NAME Latin name mappings)
  useEffect(() => {
    if (!searchLatin || !debouncedSearch.trim() || debouncedSearch.trim().length < 3) {
      setSynonymMatches([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/synonyms?q=${encodeURIComponent(debouncedSearch.trim())}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.matches) {
          setSynonymMatches(data.matches);
        }
      })
      .catch(() => {
        if (!cancelled) setSynonymMatches([]);
      });

    return () => { cancelled = true; };
  }, [debouncedSearch, searchLatin]);

  // Filter species — respect search mode toggles
  const filteredSpecies = debouncedSearch.trim()
    ? species.filter((sp) => {
        const lowerSearch = debouncedSearch.toLowerCase();
        const latinMatch = searchLatin && sp.scientificName.toLowerCase().includes(lowerSearch);
        const commonMatch = searchCommon && (
          sp.allCommonNames?.some(n => n.toLowerCase().includes(lowerSearch))
          ?? sp.commonName?.toLowerCase().includes(lowerSearch)
          ?? false
        );
        return latinMatch || commonMatch;
      })
    : [];

  // Build synonym-matched species
  const synonymSpecies: Array<SpeciesItem & { synonymOf: string }> = [];
  if (synonymMatches.length > 0) {
    const directIds = new Set(filteredSpecies.map(sp => sp.scientificName.toLowerCase()));
    for (const match of synonymMatches) {
      const validLower = match.validName.toLowerCase();
      if (directIds.has(validLower)) continue;
      const found = species.find(sp => sp.scientificName.toLowerCase() === validLower);
      if (found) {
        synonymSpecies.push({ ...found, synonymOf: match.synonym });
        directIds.add(validLower);
      }
    }
  }

  const totalResults = filteredSpecies.length + synonymSpecies.length;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  return (
    <Command shouldFilter={false} className="border-b">
      {/* Search mode toggles */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/50">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox
            checked={searchLatin}
            onCheckedChange={(checked) => setSearchLatin(!!checked)}
          />
          <span className="text-muted-foreground">Latin names</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox
            checked={searchCommon}
            onCheckedChange={(checked) => setSearchCommon(!!checked)}
          />
          <span className="text-muted-foreground">Common names</span>
        </label>
      </div>
      <CommandInput
        placeholder="Search by scientific or common name..."
        value={search}
        onValueChange={handleSearchChange}
      />
      <CommandList className="max-h-64 overflow-auto">
        {debouncedSearch.trim() && totalResults === 0 && (
          <CommandEmpty>No species found</CommandEmpty>
        )}
        {filteredSpecies.length > 0 && (
          <CommandGroup heading={`${totalResults} results`}>
            {filteredSpecies.slice(0, 50).map((sp) => (
              <CommandItem
                key={sp.id}
                value={sp.id}
                onSelect={() => onSelect(sp)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium italic">{sp.scientificName}</span>
                {(sp.allCommonNames?.length ?? 0) > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {sp.allCommonNames!.join(', ')}
                  </span>
                ) : sp.commonName ? (
                  <span className="text-xs text-muted-foreground">
                    {sp.commonName}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  Family: {sp.family}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {synonymSpecies.length > 0 && (
          <CommandGroup heading="Synonym matches">
            {synonymSpecies.slice(0, 20).map((sp) => (
              <CommandItem
                key={`syn-${sp.id}`}
                value={`syn-${sp.id}`}
                onSelect={() => onSelect(sp)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium italic">{sp.scientificName}</span>
                <span className="text-xs text-amber-400">
                  Synonym of {sp.scientificName} ({sp.synonymOf})
                </span>
                {sp.commonName && (
                  <span className="text-xs text-muted-foreground">
                    {sp.commonName}
                  </span>
                )}
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
