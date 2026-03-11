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
 * Special keys (__MEAN__, __MIN__, __MAX__, __CONF__, __CONF_TYPE__) read from
 * the normalized top-level RawMeasurement fields instead of rawFields.
 */
function getRawField(row: RawMeasurement, csvField: string): unknown {
  if (csvField === '__MEAN__') return row.value ?? null;
  if (csvField === '__MIN__') return row.metadata?.minValue ?? null;
  if (csvField === '__MAX__') return row.metadata?.maxValue ?? null;
  if (csvField === '__CONF__') return row.metadata?.confValue ?? null;
  if (csvField === '__CONF_TYPE__') return row.metadata?.confType ?? null;
  return row.metadata?.rawFields?.[csvField] ?? null;
}

// ==================== TRAIT-SPECIFIC COLUMN DEFINITIONS ====================
// Based on columns_per_type.txt — only show relevant extra columns per TYPE.

/**
 * Standard measurement columns shared by most trait types.
 * @param preCols - Columns before Mean/Min/Max (e.g. N, qualitative info)
 * @param postCols - Columns after Max/Conf (e.g. Mean Type, Conf Type, Length Type, Temperature)
 * @param ctx - Optional context for trait-specific descriptions (e.g. { trait: "flexion age", unit: "days post-hatching" })
 */
function stdMeasurementCols(
  preCols: TraitColumnDef[],
  postCols: TraitColumnDef[] = [],
  ctx?: { trait: string; unit: string }
): TraitColumnDef[] {
  const t = ctx?.trait || "measured value";
  const u = ctx?.unit ? ` (${ctx.unit})` : "";
  return [
    { key: "VALID_NAME", label: "Name", description: "Valid species name (accepted taxonomy)", csvField: "VALID_NAME" },
    ...preCols,
    { key: "__MEAN__", label: "Mean", description: `Mean ${t}${u}`, csvField: "__MEAN__" },
    { key: "__MIN__", label: "Min", description: `Minimum ${t} observed${u}`, csvField: "__MIN__" },
    { key: "__MAX__", label: "Max", description: `Maximum ${t} observed${u}`, csvField: "__MAX__" },
    { key: "__CONF__", label: "Conf", description: `Confidence interval for ${t} (standard deviation or standard error)`, csvField: "__CONF__" },
    ...postCols,
    { key: "EXT_REF", label: "External References", description: "Source study of the information cited in the main reference", csvField: "EXT_REF" },
    { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open the original publication link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
  ];
}

/** Egg diameter columns — per columns_per_type.txt: EGG_L_MEAN_TYPE, EGG_DIAMETER_CONF_TYPE */
const EGG_DIAMETER_COLUMNS: TraitColumnDef[] = stdMeasurementCols([], [
  { key: "EGG_L_MEAN_TYPE", label: "Mean Type", description: "How the egg diameter mean was computed (e.g. arithmetic mean, median)", csvField: "EGG_L_MEAN_TYPE" },
  { key: "EGG_DIAMETER_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "EGG_DIAMETER_CONF_TYPE" },
], { trait: "egg diameter", unit: "mm" });

/** Yolk diameter columns — per columns_per_type.txt: YOLK_SIZE_MEAN_TYPE */
const YOLK_DIAMETER_COLUMNS: TraitColumnDef[] = stdMeasurementCols([], [
  { key: "YOLK_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the yolk diameter mean was computed", csvField: "YOLK_SIZE_MEAN_TYPE" },
], { trait: "yolk diameter", unit: "mm" });

/** Oil globule size columns — per columns_per_type.txt: OIL_GLOBULE_SIZE_MEAN_TYPE */
const OIL_GLOBULE_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([], [
  { key: "OIL_GLOBULE_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the oil globule size mean was computed", csvField: "OIL_GLOBULE_SIZE_MEAN_TYPE" },
], { trait: "oil globule size", unit: "mm" });

/** Egg volume columns — per columns_per_type.txt: EGG_VOLUME_TYPE */
const EGG_VOLUME_COLUMNS: TraitColumnDef[] = stdMeasurementCols([], [
  { key: "EGG_VOLUME_TYPE", label: "Volume Type", description: "How egg volume was measured or estimated", csvField: "EGG_VOLUME_TYPE" },
], { trait: "egg volume", unit: "mm³" });

/** Incubation duration columns — per columns_per_type.txt: MEAN_TYPE + temperature */
const INCUBATION_DURATION_COLUMNS: TraitColumnDef[] = stdMeasurementCols([], [
  { key: "INCUBATION_GESTATION_HOUR_MEAN_TYPE", label: "Mean Type", description: "How the incubation/gestation duration mean was computed", csvField: "INCUBATION_GESTATION_HOUR_MEAN_TYPE" },
  { key: "INCUBATION_GESTATION_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean water temperature during incubation (°C)", csvField: "INCUBATION_GESTATION_TEMPERATURE_MEAN" },
  { key: "INCUBATION_GESTATION_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum water temperature during incubation (°C)", csvField: "INCUBATION_GESTATION_TEMPERATURE_MIN" },
  { key: "INCUBATION_GESTATION_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum water temperature during incubation (°C)", csvField: "INCUBATION_GESTATION_TEMPERATURE_MAX" },
  { key: "INCUBATION_GESTATION_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the incubation temperature mean was computed", csvField: "INCUBATION_GESTATION_TEMPERATURE_MEAN_TYPE" },
], { trait: "incubation/gestation duration", unit: "hours" });

/** Hatching size — per columns_per_type.txt */
const HATCHING_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([], [
  { key: "HATCHING_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the hatching size mean was computed", csvField: "HATCHING_SIZE_MEAN_TYPE" },
  { key: "HATCHING_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "HATCHING_SIZE_CONF_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "hatching/parturition size", unit: "mm" });

/** First feeding age — per columns_per_type.txt */
const FIRST_FEEDING_AGE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "FIRST_FEEDING_DPH_MEAN_TYPE", label: "Mean Type", description: "How the first feeding age mean was computed", csvField: "FIRST_FEEDING_DPH_MEAN_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "first feeding age", unit: "days post-hatching" });

/** Yolk absorption age — same pattern as first feeding age */
const YOLK_ABSORPTION_AGE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "YOLK_ABSORPTION_MEAN_TYPE", label: "Mean Type", description: "How the yolk absorption age mean was computed", csvField: "YOLK_ABSORPTION_MEAN_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "yolk absorption age", unit: "days post-hatching" });

/** First feeding size — per columns_per_type.txt */
const FIRST_FEEDING_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "FIRST_FEEDING_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the first feeding size mean was computed", csvField: "FIRST_FEEDING_SIZE_MEAN_TYPE" },
  { key: "FIRST_FEEDING_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "FIRST_FEEDING_SIZE_CONF_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "first feeding size", unit: "mm" });

/** Yolk absorption size — per columns_per_type.txt */
const YOLK_ABSORBED_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "YOLK_SAC_ABSORBED_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the yolk absorption size mean was computed", csvField: "YOLK_SAC_ABSORBED_SIZE_MEAN_TYPE" },
  { key: "YOLK_SAC_ABSORBED_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "YOLK_SAC_ABSORBED_SIZE_CONF_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "yolk-absorbed size", unit: "mm" });

/** Flexion age — per columns_per_type.txt */
const FLEXION_AGE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "FLEXION_INFOS", label: "Flexion Info", description: "Additional notochord flexion information", csvField: "FLEXION_INFOS" },
], [
  { key: "FLEXION_AGE_DPH_MEAN_TYPE", label: "Mean Type", description: "How the flexion age mean was computed", csvField: "FLEXION_AGE_DPH_MEAN_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "flexion age", unit: "days post-hatching" });

/** Flexion size — per columns_per_type.txt */
const FLEXION_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "FLEXION_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the flexion size mean was computed", csvField: "FLEXION_SIZE_MEAN_TYPE" },
  { key: "FLEXION_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "FLEXION_SIZE_CONF_TYPE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of body length measurement (SL, TL, NL, etc.)", csvField: "LENGTH_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "flexion size", unit: "mm" });

/** Metamorphosis age — per columns_per_type.txt */
const METAMORPHOSIS_AGE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "MET_DEFINITION", label: "Met Definition", description: "How metamorphosis was defined for this study", csvField: "MET_DEFINITION" },
  { key: "MET_AGE_INFOS", label: "Met Age Info", description: "Additional metamorphosis age information", csvField: "MET_AGE_INFOS" },
], [
  { key: "MET_AGE_DPH_MEAN_TYPE", label: "Mean Type", description: "How the metamorphosis age mean was computed", csvField: "MET_AGE_DPH_MEAN_TYPE" },
  { key: "MET_AGE_DPH_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "MET_AGE_DPH_CONF_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "metamorphosis age", unit: "days post-hatching" });

/** Metamorphosis duration — per columns_per_type.txt */
const METAMORPHOSIS_DURATION_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "MET_AGE_INFOS", label: "Met Age Info", description: "Additional age information", csvField: "MET_AGE_INFOS" },
], [
  { key: "MET_DURATION_MEAN_TYPE", label: "Mean Type", description: "How the metamorphosis duration mean was computed", csvField: "MET_DURATION_MEAN_TYPE" },
  { key: "MET_DURATION_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "MET_DURATION_CONF_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Minimum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Maximum rearing water temperature (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the rearing temperature mean was computed", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
], { trait: "metamorphosis duration", unit: "days" });

/** Metamorphosis size — per columns_per_type.txt */
const METAMORPHOSIS_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "MET_PARTICULARITY", label: "Particularity", description: "Met particularity", csvField: "MET_PARTICULARITY" },
  { key: "MET_SIZE_INFOS", label: "Size Info", description: "Additional size information", csvField: "MET_SIZE_INFOS" },
], [
  { key: "MET_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the metamorphosis size mean was computed", csvField: "MET_SIZE_MEAN_TYPE" },
  { key: "MET_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence", csvField: "MET_SIZE_CONF_TYPE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of length measurement", csvField: "LENGTH_TYPE" },
  { key: "REARING_TEMPERATURE_MEAN", label: "Temp Mean", description: "Rearing temperature (°C)", csvField: "REARING_TEMPERATURE_MEAN" },
  { key: "REARING_TEMPERATURE_MIN", label: "Temp Min", description: "Min rearing temp (°C)", csvField: "REARING_TEMPERATURE_MIN" },
  { key: "REARING_TEMPERATURE_MAX", label: "Temp Max", description: "Max rearing temp (°C)", csvField: "REARING_TEMPERATURE_MAX" },
  { key: "REARING_TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "Type of temperature mean", csvField: "REARING_TEMPERATURE_MEAN_TYPE" },
]);

/** Settlement age — per columns_per_type.txt (field-based + temperature) */
const SETTLEMENT_AGE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "SAMPLING_DATES", label: "Sampling Dates", description: "Date range when specimens were collected", csvField: "SAMPLING_DATES" },
  { key: "START_DATE", label: "Start Date", description: "First sampling date", csvField: "START_DATE" },
  { key: "END_DATE", label: "End Date", description: "Last sampling date", csvField: "END_DATE" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild or Reared)", csvField: "ORIGIN" },
  { key: "LATITUDE", label: "Latitude", description: "Sampling site latitude (decimal degrees)", csvField: "LATITUDE" },
  { key: "LONGITUDE", label: "Longitude", description: "Sampling site longitude (decimal degrees)", csvField: "LONGITUDE" },
  { key: "ARTICLE_GPS_COORD", label: "GPS Coord", description: "GPS coordinates as reported in the article", csvField: "ARTICLE_GPS_COORD" },
  { key: "APPROX_GPS", label: "Approx GPS", description: "Whether GPS coordinates are approximate", csvField: "APPROX_GPS" },
  { key: "LOCATION", label: "Location", description: "Geographic location name", csvField: "LOCATION" },
  { key: "COUNTRY", label: "Country", description: "Country where specimens were collected", csvField: "COUNTRY" },
  { key: "GEAR", label: "Gear", description: "Sampling gear used (e.g. light trap, plankton net)", csvField: "GEAR" },
  { key: "OTOLITH", label: "Otolith", description: "Whether otolith analysis was used for age estimation", csvField: "OTOLITH" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "SET_AGE_DPH_MEAN_TYPE", label: "Mean Type", description: "How the settlement age mean was computed", csvField: "SET_AGE_DPH_MEAN_TYPE" },
  { key: "SET_AGE_DPH_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "SET_AGE_DPH_CONF_TYPE" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean water temperature at sampling site (°C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum water temperature at sampling site (°C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum water temperature at sampling site (°C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the water temperature mean was computed", csvField: "TEMPERATURE_MEAN_TYPE" },
], { trait: "settlement age", unit: "days post-hatching" });

/** Settlement size — per columns_per_type.txt */
const SETTLEMENT_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "SAMPLING_DATES", label: "Sampling Dates", description: "Date range when specimens were collected", csvField: "SAMPLING_DATES" },
  { key: "START_DATE", label: "Start Date", description: "First sampling date", csvField: "START_DATE" },
  { key: "END_DATE", label: "End Date", description: "Last sampling date", csvField: "END_DATE" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild or Reared)", csvField: "ORIGIN" },
  { key: "LATITUDE", label: "Latitude", description: "Sampling site latitude (decimal degrees)", csvField: "LATITUDE" },
  { key: "LONGITUDE", label: "Longitude", description: "Sampling site longitude (decimal degrees)", csvField: "LONGITUDE" },
  { key: "ARTICLE_GPS_COORD", label: "GPS Coord", description: "GPS coordinates as reported in the article", csvField: "ARTICLE_GPS_COORD" },
  { key: "APPROX_GPS", label: "Approx GPS", description: "Whether GPS coordinates are approximate", csvField: "APPROX_GPS" },
  { key: "LOCATION", label: "Location", description: "Geographic location name", csvField: "LOCATION" },
  { key: "COUNTRY", label: "Country", description: "Country where specimens were collected", csvField: "COUNTRY" },
  { key: "GEAR", label: "Gear", description: "Sampling gear used (e.g. light trap, plankton net)", csvField: "GEAR" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "SET_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the settlement size mean was computed", csvField: "SET_SIZE_MEAN_TYPE" },
  { key: "SET_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "SET_SIZE_CONF_TYPE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of body length measurement (SL, TL, NL, etc.)", csvField: "LENGTH_TYPE" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean water temperature at sampling site (°C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum water temperature at sampling site (°C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum water temperature at sampling site (°C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "How the water temperature mean was computed", csvField: "TEMPERATURE_MEAN_TYPE" },
], { trait: "settlement size", unit: "mm" });

/** Pelagic juvenile size — per columns_per_type.txt */
const PELAGIC_JUVENILE_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "KEY_WORD", label: "Key Word", description: "Key word", csvField: "KEY_WORD" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "PELAGIC_JUV_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the pelagic juvenile size mean was computed", csvField: "PELAGIC_JUV_SIZE_MEAN_TYPE" },
  { key: "PELAGIC_JUV_SIZE_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "PELAGIC_JUV_SIZE_CONF_TYPE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of body length measurement (SL, TL, NL, etc.)", csvField: "LENGTH_TYPE" },
], { trait: "pelagic juvenile size", unit: "mm" });

/** Pelagic juvenile duration — per columns_per_type.txt */
const PELAGIC_JUVENILE_DURATION_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "KEY_WORD", label: "Key Word", description: "Key word", csvField: "KEY_WORD" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
], [
  { key: "PELAGIC_JUV_DURATION_MEAN_TYPE", label: "Mean Type", description: "How the pelagic juvenile duration mean was computed", csvField: "PELAGIC_JUV_DURATION_MEAN_TYPE" },
  { key: "PELAGIC_JUV_DURATION_CONF_TYPE", label: "Conf Type", description: "Type of confidence measure (SD, SE, range)", csvField: "PELAGIC_JUV_DURATION_CONF_TYPE" },
], { trait: "pelagic juvenile duration", unit: "days" });

/** Rafters size — per columns_per_type.txt */
const RAFTING_SIZE_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "FLOATSAM", label: "Flotsam", description: "Type of floating substrate (e.g. Sargassum, debris, jellyfish)", csvField: "FLOATSAM" },
  { key: "STAGE", label: "Stage", description: "Developmental stage of the fish (larva, juvenile, etc.)", csvField: "STAGE" },
], [
  { key: "RAFTING_SIZE_MEAN_TYPE", label: "Mean Type", description: "How the rafting fish size mean was computed", csvField: "RAFTING_SIZE_MEAN_TYPE" },
  { key: "LENGTH_TYPE", label: "Length Type", description: "Type of body length measurement (SL, TL, NL, etc.)", csvField: "LENGTH_TYPE" },
], { trait: "rafting size", unit: "mm" });

/** Rafting behavior/duration — per columns_per_type.txt: just FLOATSAM, STAGE */
const RAFTING_BEHAVIOR_COLUMNS: TraitColumnDef[] = stdMeasurementCols([
  { key: "FLOATSAM", label: "Flotsam", description: "Floating substrate type", csvField: "FLOATSAM" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
], []);

/** Vertical Distribution table columns — matches fixes-round3.md spec exactly */
export const VERTICAL_DISTRIBUTION_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "GEAR", label: "Gear", description: "Sampling gear used", csvField: "GEAR" },
  { key: "PERIOD", label: "Period", description: "Sampling period (Day/Night)", csvField: "PERIOD" },
  { key: "ZONE", label: "Zone", description: "Sampling zone", csvField: "ZONE" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "POSITION_ISLAND", label: "Island position", description: "Position relative to island", csvField: "POSITION_ISLAND" },
  { key: "DEPTH_INTERVAL_CONSIDERED", label: "Depth fished", description: "Depth interval considered", csvField: "DEPTH_INTERVAL_CONSIDERED" },
  { key: "N_CAPTURE", label: "N", description: "Number of captures", csvField: "N_CAPTURE" },
  { key: "WEIGHTED_MEAN_DEPTH_CAPTURE", label: "Mean", description: "Weighted mean depth of capture (m)", csvField: "WEIGHTED_MEAN_DEPTH_CAPTURE" },
  { key: "MIN_DEPTH_CAPTURE", label: "Min", description: "Minimum depth of capture (m)", csvField: "MIN_DEPTH_CAPTURE" },
  { key: "MAX_DEPTH_CAPTURE", label: "Max", description: "Maximum depth of capture (m)", csvField: "MAX_DEPTH_CAPTURE" },
  { key: "WEIGHTED_SD_DEPTH_CAPTURE", label: "SD", description: "Weighted SD of depth capture (m)", csvField: "WEIGHTED_SD_DEPTH_CAPTURE" },
  { key: "WEIGHTING_DETAILS", label: "Weighting", description: "Details of weighting method", csvField: "WEIGHTING_DETAILS" },
  { key: "EXT_REF", label: "External references", description: "Source study of the information cited in the main reference", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** Critical Swimming Speed (Absolute) table columns */
export const CRITICAL_SWIMMING_ABS_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "UCRIT_ABS_MEAN", label: "Mean", description: "Mean absolute Ucrit (cm/s)", csvField: "UCRIT_ABS_MEAN" },
  { key: "UCRIT_ABS_MIN", label: "Min", description: "Minimum absolute Ucrit (cm/s)", csvField: "UCRIT_ABS_MIN" },
  { key: "UCRIT_ABS_MAX", label: "Max", description: "Maximum absolute Ucrit (cm/s)", csvField: "UCRIT_ABS_MAX" },
  { key: "UCRIT_ABS_CONF", label: "Conf", description: "Confidence interval", csvField: "UCRIT_ABS_CONF" },
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

  { key: "EXT_REF", label: "External References", description: "Source study of the information cited in the main reference", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** Critical Swimming Speed (Relative) table columns */
export const CRITICAL_SWIMMING_REL_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "UCRIT_REL_MEAN", label: "Mean", description: "Mean relative Ucrit (BL/s)", csvField: "UCRIT_REL_MEAN" },
  { key: "UCRIT_REL_MIN", label: "Min", description: "Minimum relative Ucrit (BL/s)", csvField: "UCRIT_REL_MIN" },
  { key: "UCRIT_REL_MAX", label: "Max", description: "Maximum relative Ucrit (BL/s)", csvField: "UCRIT_REL_MAX" },
  { key: "UCRIT_REL_CONF", label: "Conf", description: "Confidence interval", csvField: "UCRIT_REL_CONF" },
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

  { key: "EXT_REF", label: "External References", description: "Source study of the information cited in the main reference", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** In Situ Swimming Speed (Absolute) table columns */
export const IN_SITU_SWIMMING_ABS_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "ISS_ABS_MEAN", label: "Mean", description: "Mean absolute ISS (cm/s)", csvField: "ISS_ABS_MEAN" },
  { key: "ISS_ABS_MIN", label: "Min", description: "Minimum absolute ISS (cm/s)", csvField: "ISS_ABS_MIN" },
  { key: "ISS_ABS_MAX", label: "Max", description: "Maximum absolute ISS (cm/s)", csvField: "ISS_ABS_MAX" },
  { key: "ISS_ABS_CONF", label: "Conf", description: "Confidence interval", csvField: "ISS_ABS_CONF" },
  { key: "TEMPERATURE_MEAN", label: "Temp Mean", description: "Mean temperature (\u00B0C)", csvField: "TEMPERATURE_MEAN" },
  { key: "TEMPERATURE_MIN", label: "Temp Min", description: "Minimum temperature (\u00B0C)", csvField: "TEMPERATURE_MIN" },
  { key: "TEMPERATURE_MAX", label: "Temp Max", description: "Maximum temperature (\u00B0C)", csvField: "TEMPERATURE_MAX" },
  { key: "TEMPERATURE_CONF", label: "Temp Conf", description: "Temperature confidence interval", csvField: "TEMPERATURE_CONF" },
  { key: "TEMPERATURE_MEAN_TYPE", label: "Temp Mean Type", description: "Type of temperature mean", csvField: "TEMPERATURE_MEAN_TYPE" },
  { key: "TEMPERATURE_CONF_TYPE", label: "Temp Conf Type", description: "Type of temperature confidence", csvField: "TEMPERATURE_CONF_TYPE" },
  { key: "ISS_ABS_MEAN_TYPE", label: "ISS Abs Mean Type", description: "Type of absolute ISS mean", csvField: "ISS_ABS_MEAN_TYPE" },
  { key: "ISS_ABS_RANGE_TYPE", label: "ISS Abs Range Type", description: "Type of absolute ISS range", csvField: "ISS_ABS_RANGE_TYPE" },
  { key: "ISS_ABS_CONF_TYPE", label: "ISS Abs Conf Type", description: "Type of absolute ISS confidence", csvField: "ISS_ABS_CONF_TYPE" },

  { key: "EXT_REF", label: "External References", description: "Source study of the information cited in the main reference", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** In Situ Swimming Speed (Relative) table columns */
export const IN_SITU_SWIMMING_REL_COLUMNS: TraitColumnDef[] = [
  { key: "VALID_NAME", label: "Name", description: "Valid species name", csvField: "VALID_NAME" },
  { key: "ORIGIN", label: "Origin", description: "Sample origin (Wild/Reared)", csvField: "ORIGIN" },
  { key: "LOCATION", label: "Location", description: "Geographic location", csvField: "LOCATION" },
  { key: "N", label: "N", description: "Number of specimens measured", csvField: "N" },
  { key: "AGE_RANGE_DPH", label: "Age Range (DPH)", description: "Age range in days post-hatch", csvField: "AGE_RANGE_DPH" },
  { key: "STAGE", label: "Stage", description: "Developmental stage", csvField: "STAGE" },
  { key: "ISS_REL_MEAN", label: "Mean", description: "Mean relative ISS (BL/s)", csvField: "ISS_REL_MEAN" },
  { key: "ISS_REL_MIN", label: "Min", description: "Minimum relative ISS (BL/s)", csvField: "ISS_REL_MIN" },
  { key: "ISS_REL_MAX", label: "Max", description: "Maximum relative ISS (BL/s)", csvField: "ISS_REL_MAX" },
  { key: "ISS_REL_CONF", label: "Conf", description: "Confidence interval", csvField: "ISS_REL_CONF" },
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
  { key: "ISS_REL_MEAN_TYPE", label: "ISS Rel Mean Type", description: "Type of relative ISS mean", csvField: "ISS_REL_MEAN_TYPE" },
  { key: "ISS_REL_RANGE_TYPE", label: "ISS Rel Range Type", description: "Type of relative ISS range", csvField: "ISS_REL_RANGE_TYPE" },
  { key: "ISS_REL_CONF_TYPE", label: "ISS Rel Conf Type", description: "Type of relative ISS confidence", csvField: "ISS_REL_CONF_TYPE" },

  { key: "EXT_REF", label: "External References", description: "Source study of the information cited in the main reference", csvField: "EXT_REF" },
  { key: "REFERENCE", label: "Main Reference", description: "Data source citation (click to open link)", csvField: "REFERENCE", isReference: true, linkField: "LINK" },
];

/** Map trait types to their specific column definitions */
const TRAIT_SPECIFIC_COLUMNS: Record<string, TraitColumnDef[]> = {
  // Egg & Incubation
  egg_diameter: EGG_DIAMETER_COLUMNS,
  egg_volume: EGG_VOLUME_COLUMNS,
  yolk_diameter: YOLK_DIAMETER_COLUMNS,
  oil_globule_size: OIL_GLOBULE_SIZE_COLUMNS,
  incubation_duration: INCUBATION_DURATION_COLUMNS,
  // Hatching & Pre-flexion
  hatching_size: HATCHING_SIZE_COLUMNS,
  first_feeding_age: FIRST_FEEDING_AGE_COLUMNS,
  first_feeding_size: FIRST_FEEDING_SIZE_COLUMNS,
  yolk_absorption_age: YOLK_ABSORPTION_AGE_COLUMNS,
  yolk_absorbed_size: YOLK_ABSORBED_SIZE_COLUMNS,
  // Flexion
  flexion_age: FLEXION_AGE_COLUMNS,
  flexion_size: FLEXION_SIZE_COLUMNS,
  // Metamorphosis
  metamorphosis_age: METAMORPHOSIS_AGE_COLUMNS,
  metamorphosis_duration: METAMORPHOSIS_DURATION_COLUMNS,
  metamorphosis_size: METAMORPHOSIS_SIZE_COLUMNS,
  // Settlement
  settlement_age: SETTLEMENT_AGE_COLUMNS,
  settlement_size: SETTLEMENT_SIZE_COLUMNS,
  // Active Behaviors
  vertical_distribution: VERTICAL_DISTRIBUTION_COLUMNS,
  vertical_day_depth: VERTICAL_DISTRIBUTION_COLUMNS,
  vertical_night_depth: VERTICAL_DISTRIBUTION_COLUMNS,
  critical_swimming_speed: CRITICAL_SWIMMING_ABS_COLUMNS,
  critical_swimming_speed_rel: CRITICAL_SWIMMING_REL_COLUMNS,
  in_situ_swimming_speed: IN_SITU_SWIMMING_ABS_COLUMNS,
  in_situ_swimming_speed_rel: IN_SITU_SWIMMING_REL_COLUMNS,
  // Pelagic Juvenile
  pelagic_juvenile_size: PELAGIC_JUVENILE_SIZE_COLUMNS,
  pelagic_juvenile_duration: PELAGIC_JUVENILE_DURATION_COLUMNS,
  // Rafting
  rafting_size: RAFTING_SIZE_COLUMNS,
  rafting_behavior: RAFTING_BEHAVIOR_COLUMNS,
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
  { key: "externalRef", label: "External reference", description: "Source study of the information cited in the main reference" },
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
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col w-[95vw] md:w-auto">
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

        {/* Remarks are shown as a column inside the enlarged table, not as a separate section */}
      </DialogContent>
    </Dialog>
  );
}
