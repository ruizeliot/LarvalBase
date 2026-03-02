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
 * Format a reference cell: REFERENCE text hyperlinked to LINK URL.
 */
function ReferenceCell({ source, link }: { source: string | null; link: string | null }) {
  if (link) {
    return (
      <a
        href={link}
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
  if (value === null || value === undefined || value === "" || value === "NA") return "-";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
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
    return `${mean.toFixed(1)}\u00B0C (${min.toFixed(1)}-${max.toFixed(1)})`;
  }
  return `${mean.toFixed(1)}\u00B0C`;
}

/** Column definition for trait-specific tables */
interface TraitColumnDef {
  key: string;
  label: string;
  description: string;
  /** If set, render as reference cell (hyperlinked) */
  isReference?: boolean;
  /** CSV field name to read from rawFields */
  csvField: string;
  /** CSV field for the hyperlink URL (used with isReference) */
  linkField?: string;
}

/**
 * Get raw field value from a measurement row.
 */
function getRawField(row: RawMeasurement, csvField: string): unknown {
  return row.metadata?.rawFields?.[csvField] ?? null;
}

// ==================== TRAIT-SPECIFIC COLUMN DEFINITIONS ====================

/** Vertical Distribution table columns */
export const VERTICAL_DISTRIBUTION_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "LATITUDE", label: "Latitude", description: "Latitude coordinates", csvField: "LATITUDE" },
  { key: "LONGITUDE", label: "Longitude", description: "Longitude coordinates", csvField: "LONGITUDE" },
  { key: "GEAR", label: "Gear", description: "Sampling gear used", csvField: "GEAR" },
  { key: "PERIOD", label: "Period", description: "Sampling period (Day/Night)", csvField: "PERIOD" },
  { key: "ZONE", label: "Zone", description: "Sampling zone", csvField: "ZONE" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "POSITION_ISLAND", label: "Position Island", description: "Position relative to island", csvField: "POSITION_ISLAND" },
  { key: "FILTERED_VOLUME", label: "Filtered Volume", description: "Volume of water filtered", csvField: "FILTERED_VOLUME" },
  { key: "BOTTOM_DEPTH", label: "Bottom Depth", description: "Bottom depth (m)", csvField: "BOTTOM_DEPTH" },
  { key: "DEPTH_INTERVAL_CONSIDERED", label: "Depth Interval", description: "Depth interval considered", csvField: "DEPTH_INTERVAL_CONSIDERED" },
  { key: "N_CAPTURE", label: "N Capture", description: "Number of captures", csvField: "N_CAPTURE" },
  { key: "MIN_DEPTH_CAPTURE", label: "Min Depth Capture", description: "Minimum depth of capture (m)", csvField: "MIN_DEPTH_CAPTURE" },
  { key: "MAX_DEPTH_CAPTURE", label: "Max Depth Capture", description: "Maximum depth of capture (m)", csvField: "MAX_DEPTH_CAPTURE" },
  { key: "WEIGHTING_DETAILS", label: "Weighting Details", description: "Details of weighting method", csvField: "WEIGHTING_DETAILS" },
  { key: "EXT_REF", label: "External References", description: "External reference identifier", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** Critical Swimming Speed (Absolute) table columns */
export const CRITICAL_SWIMMING_ABS_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Sample size", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean temperature (\u00B0C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum temperature (\u00B0C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum temperature (\u00B0C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_CONF", label: "Temp Conf", description: "Temperature confidence interval", csvField: "TEMPERATURE_CONF" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "Type of temperature mean", csvField: "TEMPERATURE_MEAN_TYPE" },
  { key: "TEMPERATURE_CONF_TYPE", label: "Temp Conf Type", description: "Type of temperature confidence", csvField: "TEMPERATURE_CONF_TYPE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of length measurement (SL/TL)", csvField: "LENGTH_TYPE" },
  { key: "LENGTH_MEAN", label: "Length Mean", description: "Mean length (mm)", csvField: "LENGTH_MEAN" },
  { key: "UCRIT_ABS_MEAN_TYPE", label: "Ucrit Abs Mean Type", description: "Type of absolute Ucrit mean", csvField: "UCRIT_ABS_MEAN_TYPE" },
  { key: "UCRIT_ABS_RANGE_TYPE", label: "Ucrit Abs Range Type", description: "Type of absolute Ucrit range", csvField: "UCRIT_ABS_RANGE_TYPE" },
  { key: "UCRIT_ABS_CONF_TYPE", label: "Ucrit Abs Conf Type", description: "Type of absolute Ucrit confidence", csvField: "UCRIT_ABS_CONF_TYPE" },
  { key: "REMARKS", label: "Remarks", description: "Additional notes", csvField: "REMARKS" },
  { key: "EXT_REF", label: "External References", description: "External reference identifier", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** Critical Swimming Speed (Relative) table columns */
export const CRITICAL_SWIMMING_REL_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Sample size", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of length measurement (SL/TL)", csvField: "LENGTH_TYPE" },
  { key: "LENGTH_MEAN", label: "Length Mean", description: "Mean length (mm)", csvField: "LENGTH_MEAN" },
  { key: "LENGTH_MIN", label: "Length Min", description: "Minimum length (mm)", csvField: "LENGTH_MIN" },
  { key: "LENGTH_MAX", label: "Length Max", description: "Maximum length (mm)", csvField: "LENGTH_MAX" },
  { key: "LENGTH_CONF", label: "Length Conf", description: "Length confidence interval", csvField: "LENGTH_CONF" },
  { key: "LENGTH_CONF_TYPE", label: "Length Conf Type", description: "Type of length confidence", csvField: "LENGTH_CONF_TYPE" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean temperature (\u00B0C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum temperature (\u00B0C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum temperature (\u00B0C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_CONF", label: "Temp Conf", description: "Temperature confidence interval", csvField: "TEMPERATURE_CONF" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "Type of temperature mean", csvField: "TEMPERATURE_MEAN_TYPE" },
  { key: "TEMPERATURE_CONF_TYPE", label: "Temp Conf Type", description: "Type of temperature confidence", csvField: "TEMPERATURE_CONF_TYPE" },
  { key: "UCRIT_REL_CONF_TYPE", label: "Ucrit Rel Conf Type", description: "Type of relative Ucrit confidence", csvField: "UCRIT_REL_CONF_TYPE" },
  { key: "REMARKS", label: "Remarks", description: "Additional notes", csvField: "REMARKS" },
  { key: "EXT_REF", label: "External References", description: "External reference identifier", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** In Situ Swimming Speed (Absolute) table columns */
export const IN_SITU_SWIMMING_ABS_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Sample size", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean temperature (\u00B0C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum temperature (\u00B0C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum temperature (\u00B0C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_CONF", label: "Temp Conf", description: "Temperature confidence interval", csvField: "TEMPERATURE_CONF" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "Type of temperature mean", csvField: "TEMPERATURE_MEAN_TYPE" },
  { key: "TEMPERATURE_CONF_TYPE", label: "Temp Conf Type", description: "Type of temperature confidence", csvField: "TEMPERATURE_CONF_TYPE" },
  { key: "ISS_ABS_MEAN_TYPE", label: "ISS Abs Mean Type", description: "Type of absolute ISS mean", csvField: "ISS_ABS_MEAN_TYPE" },
  { key: "ISS_ABS_RANGE_TYPE", label: "ISS Abs Range Type", description: "Type of absolute ISS range", csvField: "ISS_ABS_RANGE_TYPE" },
  { key: "ISS_ABS_CONF_TYPE", label: "ISS Abs Conf Type", description: "Type of absolute ISS confidence", csvField: "ISS_ABS_CONF_TYPE" },
  { key: "REMARKS", label: "Remarks", description: "Additional notes", csvField: "REMARKS" },
  { key: "EXT_REF", label: "External References", description: "External reference identifier", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** In Situ Swimming Speed (Relative) table columns */
export const IN_SITU_SWIMMING_REL_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Sample size", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of length measurement (SL/TL)", csvField: "LENGTH_TYPE" },
  { key: "LENGTH_MEAN", label: "Length Mean", description: "Mean length (mm)", csvField: "LENGTH_MEAN" },
  { key: "LENGTH_MIN", label: "Length Min", description: "Minimum length (mm)", csvField: "LENGTH_MIN" },
  { key: "LENGTH_MAX", label: "Length Max", description: "Maximum length (mm)", csvField: "LENGTH_MAX" },
  { key: "LENGTH_CONF", label: "Length Conf", description: "Length confidence interval", csvField: "LENGTH_CONF" },
  { key: "LENGTH_CONF_TYPE", label: "Length Conf Type", description: "Type of length confidence", csvField: "LENGTH_CONF_TYPE" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean temperature (\u00B0C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum temperature (\u00B0C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum temperature (\u00B0C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_CONF", label: "Temp Conf", description: "Temperature confidence interval", csvField: "TEMPERATURE_CONF" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "Type of temperature mean", csvField: "TEMPERATURE_MEAN_TYPE" },
  { key: "TEMPERATURE_CONF_TYPE", label: "Temp Conf Type", description: "Type of temperature confidence", csvField: "TEMPERATURE_CONF_TYPE" },
  { key: "ISS_ABS_MEAN_TYPE", label: "ISS Abs Mean Type", description: "Type of absolute ISS mean", csvField: "ISS_ABS_MEAN_TYPE" },
  { key: "ISS_ABS_RANGE_TYPE", label: "ISS Abs Range Type", description: "Type of absolute ISS range", csvField: "ISS_ABS_RANGE_TYPE" },
  { key: "ISS_ABS_CONF_TYPE", label: "ISS Abs Conf Type", description: "Type of absolute ISS confidence", csvField: "ISS_ABS_CONF_TYPE" },
  { key: "REMARKS", label: "Remarks", description: "Additional notes", csvField: "REMARKS" },
  { key: "EXT_REF", label: "External References", description: "External reference identifier", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** Map trait types to their specific column definitions */
const TRAIT_SPECIFIC_COLUMNS: Record<string, TraitColumnDef[]> = {
  vertical_distribution: VERTICAL_DISTRIBUTION_COLUMNS,
  critical_swimming_speed: CRITICAL_SWIMMING_ABS_COLUMNS,
  critical_swimming_speed_rel: CRITICAL_SWIMMING_REL_COLUMNS,
  in_situ_swimming_speed: IN_SITU_SWIMMING_ABS_COLUMNS,
  in_situ_swimming_speed_rel: IN_SITU_SWIMMING_REL_COLUMNS,
};

/**
 * Check if a trait type has database-specific column definitions.
 */
export function hasTraitSpecificColumns(traitType: string): boolean {
  return traitType in TRAIT_SPECIFIC_COLUMNS;
}

/**
 * Get the columns for a given trait type.
 */
export function getTraitColumns(traitType: string): TraitColumnDef[] | null {
  return TRAIT_SPECIFIC_COLUMNS[traitType] ?? null;
}

/**
 * Default generic column configuration for the data table.
 */
const DEFAULT_COLUMNS = [
  { key: "value", label: "Value", description: "Mean measured value" },
  { key: "min", label: "Min", description: "Minimum value" },
  { key: "max", label: "Max", description: "Maximum value" },
  { key: "conf", label: "Conf", description: "Confidence interval or standard deviation" },
  { key: "unit", label: "Unit", description: "Unit of measurement" },
  { key: "method", label: "Method", description: "Sampling/measurement method" },
  { key: "origin", label: "Origin", description: "Sample origin (Wild/Reared)" },
  { key: "temperature", label: "Temperature", description: "Temperature conditions (\u00B0C)" },
  { key: "gear", label: "Gear", description: "Sampling gear used" },
  { key: "location", label: "Location", description: "Geographic location" },
  { key: "sampleSize", label: "N", description: "Sample size" },
  { key: "reference", label: "Main reference", description: "Data source citation (click to open link)" },
  { key: "externalRef", label: "External reference", description: "External reference identifier" },
];

/**
 * Build export data for trait-specific columns.
 */
function buildTraitSpecificExportData(
  data: RawMeasurement[],
  columns: TraitColumnDef[],
): Array<Record<string, unknown>> {
  return data.map(row => {
    const record: Record<string, unknown> = {};
    for (const col of columns) {
      if (col.isReference) {
        record[col.label] = getRawField(row, col.csvField) ?? "";
      } else {
        record[col.label] = getRawField(row, col.csvField) ?? "";
      }
    }
    return record;
  });
}

/**
 * Build export data for default generic columns.
 */
function buildDefaultExportData(
  data: RawMeasurement[],
  speciesName: string,
  traitType: string,
): Array<Record<string, unknown>> {
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
}

/**
 * RawDataModal displays raw measurements in a scrollable table with metadata.
 * For Active Behaviors traits, shows database-specific columns from raw CSV data.
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

  const traitColumns = getTraitColumns(traitType);
  const useTraitSpecific = traitColumns !== null && data.length > 0 && data[0].metadata?.rawFields !== undefined;

  // Prepare export data
  const exportData = useMemo(() => {
    if (useTraitSpecific && traitColumns) {
      return buildTraitSpecificExportData(data, traitColumns);
    }
    return buildDefaultExportData(data, speciesName, traitType);
  }, [data, speciesName, traitType, useTraitSpecific, traitColumns]);

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
            ) : useTraitSpecific && traitColumns ? (
              /* Trait-specific table with database columns */
              <Table>
                <TableHeader>
                  <TableRow>
                    {traitColumns.map((col) => (
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
                      {traitColumns.map((col) => (
                        <TableCell key={col.key} className={col.isReference ? "max-w-[200px]" : "text-xs max-w-[150px] truncate"}>
                          {col.isReference ? (
                            <ReferenceCell
                              source={String(getRawField(row, col.csvField) ?? "")}
                              link={col.linkField ? String(getRawField(row, col.linkField) ?? "") : null}
                            />
                          ) : (
                            <span className="text-xs" title={String(getRawField(row, col.csvField) ?? "")}>
                              {formatCellValue(getRawField(row, col.csvField))}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              /* Default generic table */
              <Table>
                <TableHeader>
                  <TableRow>
                    {DEFAULT_COLUMNS.map((col) => (
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
                      {/* Main reference */}
                      <TableCell className="max-w-[200px]">
                        <ReferenceCell source={row.source} link={row.doi} />
                      </TableCell>
                      {/* External reference */}
                      <TableCell className="text-xs max-w-[150px] truncate" title={row.metadata?.externalRef || undefined}>
                        {row.metadata?.externalRef || "-"}
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
                    &bull; {r.metadata?.remarks}
                  </p>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
