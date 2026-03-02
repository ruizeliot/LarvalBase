"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export/csv-utils";

/**
 * Export Species List button for the homepage.
 * Fetches all species data and exports as CSV with taxonomy columns.
 */
export function SpeciesListExport() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/species", {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error("Failed to fetch species list");
        return;
      }

      const { species } = await response.json();
      if (species && species.length > 0) {
        const exportData = species.map(
          (sp: { order: string; family: string; genus: string; validName: string; commonName: string | null; id: string }) => ({
            ORDER: sp.order,
            FAMILY: sp.family,
            GENUS: sp.genus,
            VALID_NAME: sp.validName,
            COMMON_NAME: sp.commonName || "",
            SPECIES_ID: sp.id,
          })
        );
        downloadCSV(exportData, "larvalbase-species-list");
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading}
    >
      <Download className="h-4 w-4 mr-2" />
      {isLoading ? "Exporting..." : "Export Species List"}
    </Button>
  );
}
