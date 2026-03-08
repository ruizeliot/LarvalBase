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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useI18n } from "@/lib/i18n/i18n-context";

type SearchMode = "latin" | "common";

interface SpeciesItem {
  id: string;
  scientificName: string;
  commonName: string | null;
  family: string;
}

interface SynonymMatch {
  synonym: string;
  validName: string;
  authority: string;
}

interface SpeciesSearchProps {
  /** All species to search through (filtering handled by cmdk) */
  species: SpeciesItem[];
  onSelect: (species: SpeciesItem) => void;
  onSearchChange?: (search: string) => void;
}

/**
 * Species search with autocomplete, Latin/Common name toggle, and synonym support.
 * Shows species name + family as user types.
 * Results appear after 200ms debounce.
 * When a synonym is searched, shows the valid species with a "Synonym of" note.
 */
export function SpeciesSearch({
  species,
  onSelect,
  onSearchChange,
}: SpeciesSearchProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("latin");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [synonymMatches, setSynonymMatches] = useState<SynonymMatch[]>([]);

  // Fetch synonym matches when searching in latin mode
  useEffect(() => {
    if (searchMode !== "latin" || !debouncedSearch.trim() || debouncedSearch.trim().length < 3) {
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
  }, [debouncedSearch, searchMode]);

  // Filter species based on debounced search and selected mode
  const filteredSpecies = debouncedSearch.trim()
    ? species.filter((sp) => {
        const lowerSearch = debouncedSearch.toLowerCase();
        if (searchMode === "latin") {
          return sp.scientificName.toLowerCase().includes(lowerSearch);
        }
        return sp.commonName?.toLowerCase().includes(lowerSearch) ?? false;
      })
    : [];

  // Build synonym-matched species (valid names from synonym lookup)
  const synonymSpecies: Array<SpeciesItem & { synonymOf: string }> = [];
  if (searchMode === "latin" && synonymMatches.length > 0) {
    const directIds = new Set(filteredSpecies.map(sp => sp.scientificName.toLowerCase()));
    for (const match of synonymMatches) {
      const validLower = match.validName.toLowerCase();
      // Don't duplicate species already in direct results
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
      {/* Search mode radio toggle */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b bg-muted/30">
        <label className="flex items-center gap-1 cursor-pointer text-xs">
          <input
            type="radio"
            name="searchMode"
            checked={searchMode === "latin"}
            onChange={() => setSearchMode("latin")}
            className="accent-primary"
          />
          {t('search_latin_name')}
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-xs">
          <input
            type="radio"
            name="searchMode"
            checked={searchMode === "common"}
            onChange={() => setSearchMode("common")}
            className="accent-primary"
          />
          {t('search_common_name')}
        </label>
      </div>
      <div className="flex items-center border-b px-3">
        <CommandInput
          placeholder={searchMode === "latin" ? t('search_placeholder_latin') : t('search_placeholder_common')}
          value={search}
          onValueChange={handleSearchChange}
          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <CommandList className="max-h-64 overflow-auto">
        {debouncedSearch.trim() && totalResults === 0 && (
          <CommandEmpty>{t('no_species_found')}</CommandEmpty>
        )}
        {filteredSpecies.length > 0 && (
          <CommandGroup heading={`${totalResults} ${t('results')}`}>
            {filteredSpecies.slice(0, 50).map((sp) => (
              <CommandItem
                key={sp.id}
                value={sp.id}
                onSelect={() => onSelect(sp)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium italic">{sp.scientificName}</span>
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
        {synonymSpecies.length > 0 && (
          <CommandGroup heading={t('synonym_results') || 'Synonym matches'}>
            {synonymSpecies.slice(0, 20).map((sp) => (
              <CommandItem
                key={`syn-${sp.id}`}
                value={`syn-${sp.id}`}
                onSelect={() => onSelect(sp)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium italic">{sp.scientificName}</span>
                <span className="text-xs text-amber-400">
                  {t('synonym_of') || 'Synonym of'} {sp.scientificName} ({sp.synonymOf})
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
            {t('type_to_search')}
          </div>
        )}
      </CommandList>
    </Command>
  );
}
