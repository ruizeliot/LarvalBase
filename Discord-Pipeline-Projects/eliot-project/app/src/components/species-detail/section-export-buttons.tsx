"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvPreviewModal } from "./csv-preview-modal";

interface SectionExportButtonsProps {
  /** Species ID for the current species */
  speciesId: string;
  /** Section title (e.g., "Egg & Incubation") */
  sectionTitle: string;
  /** Trait keys belonging to this section */
  traitKeys: string[];
}

type ExportLevel = "species" | "genus" | "family" | "order";

/**
 * Three export buttons (Species/Genus/Family) for a trait section.
 * Each button fetches data at the corresponding taxonomy level and opens a preview modal.
 */
export function SectionExportButtons({
  speciesId,
  sectionTitle,
  traitKeys,
}: SectionExportButtonsProps) {
  const [loadingLevel, setLoadingLevel] = useState<ExportLevel | null>(null);
  const [previewData, setPreviewData] = useState<Array<Record<string, unknown>>>([]);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewFilename, setPreviewFilename] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

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
        if (rows) {
          const sectionSlug = sectionTitle
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
          setPreviewData(rows);
          setPreviewTitle(`${sectionTitle} - ${levelLabel} Export`);
          setPreviewFilename(`${sectionSlug}-${level}-export`);
          setPreviewOpen(true);
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
    <>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleExport("order")}
          disabled={loadingLevel !== null}
          className="text-xs h-7 px-2"
        >
          <Download className="h-3 w-3 mr-1" />
          Order
        </Button>
      </div>

      <CsvPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={previewData}
        title={previewTitle}
        filename={previewFilename}
      />
    </>
  );
}
