"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnHeader } from "./column-header";
import { useRawData, type RawMeasurement } from "@/hooks/use-raw-data";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export/export-button";

interface RawDataModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Species ID to show data for */
  speciesId: string;
  /** Species name for display */
  speciesName: string;
  /** Trait type to filter by */
  traitType: string;
  /** Trait display name */
  traitName: string;
}

/**
 * Format a reference cell with clickable DOI link.
 */
function ReferenceCell({ source, doi }: { source: string | null; doi: string | null }) {
  const linkUrl = doi
    ? doi.startsWith("http")
      ? doi
      : `https://doi.org/${doi.replace(/^doi:/, "")}`
    : null;

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline text-xs"
      >
        {source || "Link"}
      </a>
    );
  }

  return <span className="text-xs">{source || "-"}</span>;
}

/**
 * Format a cell value for display.
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toFixed(2);
  return String(value);
}

/**
 * Format temperature display.
 */
function formatTemperature(
  mean: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (mean === null || mean === undefined) return "-";
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${mean.toFixed(1)}°C (${min.toFixed(1)}-${max.toFixed(1)})`;
  }
  return `${mean.toFixed(1)}°C`;
}

/**
 * Column configuration for the data table.
 */
const COLUMNS = [
  { key: "value", label: "Value", description: "Mean measured value" },
  { key: "min", label: "Min", description: "Minimum value" },
  { key: "max", label: "Max", description: "Maximum value" },
  { key: "conf", label: "Conf", description: "Confidence interval or standard deviation" },
  { key: "unit", label: "Unit", description: "Unit of measurement" },
  { key: "method", label: "Method", description: "Sampling/measurement method" },
  { key: "origin", label: "Origin", description: "Sample origin (Wild/Reared)" },
  { key: "temperature", label: "Temperature", description: "Temperature conditions (°C)" },
  { key: "gear", label: "Gear", description: "Sampling gear used" },
  { key: "location", label: "Location", description: "Geographic location" },
  { key: "sampleSize", label: "N", description: "Sample size" },
  { key: "reference", label: "Reference", description: "Data source citation" },
];

/**
 * RawDataModal displays raw measurements in a scrollable table with metadata.
 */
export function RawDataModal({
  open,
  onOpenChange,
  speciesId,
  speciesName,
  traitType,
  traitName,
}: RawDataModalProps) {
  const { data, isLoading, error } = useRawData(
    speciesId,
    traitType,
    open
  );

  // Prepare export data with all columns flattened
  const exportData = useMemo(() => {
    return data.map(row => ({
      Species: speciesName,
      Trait_Type: traitType,
      Value: row.value,
      Min: row.metadata?.minValue ?? "",
      Max: row.metadata?.maxValue ?? "",
      Conf: row.metadata?.confValue ?? "",
      Conf_Type: row.metadata?.confType || "",
      Unit: row.unit || "",
      Method: row.metadata?.method || "",
      Origin: row.metadata?.origin || "",
      Temperature_Mean: row.metadata?.temperatureMean ?? "",
      Temperature_Min: row.metadata?.temperatureMin ?? "",
      Temperature_Max: row.metadata?.temperatureMax ?? "",
      Gear: row.metadata?.gear || "",
      Location: row.metadata?.location || "",
      Country: row.metadata?.country || "",
      Sample_Size: row.metadata?.sampleSize ?? "",
      Length_Type: row.metadata?.lengthType || "",
      Reference: row.source || "",
      DOI: row.doi || "",
      External_Ref: row.metadata?.externalRef || "",
      Remarks: row.metadata?.remarks || "",
    }));
  }, [data, speciesName, traitType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div>
            <DialogTitle>{traitName} - Raw Data</DialogTitle>
            <DialogDescription>
              {data.length} measurement{data.length !== 1 ? "s" : ""} for <em>{speciesName}</em>
            </DialogDescription>
          </div>
          {!isLoading && !error && data.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`${speciesName.toLowerCase().replace(/\s+/g, "-")}-${traitType}-raw-data`}
              label="Export All"
              variant="outline"
              size="sm"
            />
          )}
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex-1 p-4 text-center text-destructive">
            <p>{error}</p>
          </div>
        )}

        {/* Data table */}
        {!isLoading && !error && (
          <div className="flex-1 overflow-auto">
            {data.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No measurements found for this trait.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((col) => (
                      <TableHead key={col.key} className="text-xs whitespace-nowrap">
                        <ColumnHeader
                          label={col.label}
                          description={col.description}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => (
                    <TableRow key={idx}>
                      {/* Value */}
                      <TableCell className="text-xs font-mono">
                        {formatCellValue(row.value)}
                      </TableCell>
                      {/* Min */}
                      <TableCell className="text-xs font-mono">
                        {formatCellValue(row.metadata?.minValue)}
                      </TableCell>
                      {/* Max */}
                      <TableCell className="text-xs font-mono">
                        {formatCellValue(row.metadata?.maxValue)}
                      </TableCell>
                      {/* Conf */}
                      <TableCell className="text-xs font-mono">
                        {row.metadata?.confValue != null
                          ? `${formatCellValue(row.metadata.confValue)}${row.metadata.confType ? ` (${row.metadata.confType})` : ''}`
                          : '-'}
                      </TableCell>
                      {/* Unit */}
                      <TableCell className="text-xs">
                        {row.unit || "-"}
                      </TableCell>
                      {/* Method */}
                      <TableCell className="text-xs">
                        {row.metadata?.method || "-"}
                      </TableCell>
                      {/* Origin */}
                      <TableCell className="text-xs">
                        {row.metadata?.origin || "-"}
                      </TableCell>
                      {/* Temperature */}
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatTemperature(
                          row.metadata?.temperatureMean,
                          row.metadata?.temperatureMin,
                          row.metadata?.temperatureMax
                        )}
                      </TableCell>
                      {/* Gear */}
                      <TableCell className="text-xs">
                        {row.metadata?.gear || "-"}
                      </TableCell>
                      {/* Location */}
                      <TableCell className="text-xs max-w-[150px] truncate" title={row.metadata?.location || undefined}>
                        {row.metadata?.location || row.metadata?.country || "-"}
                      </TableCell>
                      {/* Sample Size */}
                      <TableCell className="text-xs">
                        {row.metadata?.sampleSize ?? "-"}
                      </TableCell>
                      {/* Reference */}
                      <TableCell className="max-w-[200px]">
                        <ReferenceCell source={row.source} doi={row.doi} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Remarks section if any row has remarks */}
        {!isLoading && !error && data.some(r => r.metadata?.remarks) && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-medium mb-2">Remarks</h4>
            <div className="space-y-1 max-h-[100px] overflow-auto">
              {data
                .filter(r => r.metadata?.remarks)
                .map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    • {r.metadata?.remarks}
                  </p>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
