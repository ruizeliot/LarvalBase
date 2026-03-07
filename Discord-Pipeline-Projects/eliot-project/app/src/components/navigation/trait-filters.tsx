"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { TRAIT_GROUPS, formatTraitName } from "@/lib/constants/trait-groups";

interface TraitFiltersProps {
  selectedTraits: Set<string>;
  availableTraits: Set<string>;
  onTraitToggle: (trait: string) => void;
  onClearAll: () => void;
}

/**
 * Trait filter checkboxes grouped by category.
 * Uses collapsible sections for each trait group.
 * Only shows traits that have data available.
 */
export function TraitFilters({
  selectedTraits,
  availableTraits,
  onTraitToggle,
  onClearAll,
}: TraitFiltersProps) {
  // Track which groups are open (first group open by default)
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set([TRAIT_GROUPS[0]?.name])
  );

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Filter groups to only show those with available traits
  const visibleGroups = TRAIT_GROUPS.map((group) => ({
    ...group,
    traits: group.traits.filter((trait) => availableTraits.has(trait)),
  })).filter((group) => group.traits.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No trait filters available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Clear button only (label is in sidebar group header) */}
      {selectedTraits.size > 0 && (
        <div className="flex items-center justify-end px-2 py-1">
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear ({selectedTraits.size})
          </button>
        </div>
      )}

      {/* Trait groups */}
      {visibleGroups.map((group) => (
        <Collapsible
          key={group.name}
          open={openGroups.has(group.name)}
          onOpenChange={() => toggleGroup(group.name)}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-accent/50 rounded transition-colors">
            <span>{group.name}</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openGroups.has(group.name) ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 space-y-0.5">
            {group.traits.map((trait) => (
              <label
                key={trait}
                className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent/50 rounded cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedTraits.has(trait)}
                  onCheckedChange={() => onTraitToggle(trait)}
                />
                <span className="text-muted-foreground">
                  {formatTraitName(trait)}
                </span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
