"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export/csv-utils";

interface SectionExportButtonsProps {
  /** Species ID for the current species */
  speciesId: string;
  /** Section title (e.g., "Egg & Incubation") */
  sectionTitle: string;
  /** Trait keys belonging to this section */
  traitKeys: string[];
}

type ExportLevel = "species" | "genus" | "family";

/**
 * Three export buttons (Species/Genus/Family) for a trait section.
 * Each button fetches data at the corresponding taxonomy level and downloads CSV.
 */
export function SectionExportButtons({
  speciesId,
  sectionTitle,
  traitKeys,
}: SectionExportButtonsProps) {
  const [loadingLevel, setLoadingLevel] = useState<ExportLevel | null>(null);

  const handleExport = useCallback(
    async (level: ExportLevel) => {
      setLoadingLevel(level);
      try {
        const params = new URLSearchParams({
          speciesId,
          level,
          traits: traitKeys.join(","),
        });
        const response = await fetch(`/api/export/section?${params}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          console.error(`Export failed: ${response.status}`);
          return;
        }

        const { rows } = await response.json();
        if (rows && rows.length > 0) {
          const sectionSlug = sectionTitle
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          const filename = `${sectionSlug}-${level}-export`;
          downloadCSV(rows, filename);
        }
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setLoadingLevel(null);
      }
    },
    [speciesId, sectionTitle, traitKeys]
  );

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleExport("species")}
        disabled={loadingLevel !== null}
        className="text-xs h-7 px-2"
      >
        <Download className="h-3 w-3 mr-1" />
        Species
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleExport("genus")}
        disabled={loadingLevel !== null}
        className="text-xs h-7 px-2"
      >
        <Download className="h-3 w-3 mr-1" />
        Genus
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleExport("family")}
        disabled={loadingLevel !== null}
        className="text-xs h-7 px-2"
      >
        <Download className="h-3 w-3 mr-1" />
        Family
      </Button>
    </div>
  );
}
