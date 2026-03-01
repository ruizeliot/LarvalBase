/**
 * Types for growth model data.
 */

/**
 * Model types from the growth database.
 */
export type GrowthModelType =
  | 'Linear'
  | 'Polynomial (1st degree)'
  | 'Polynomial (2nd degree)'
  | 'Polynomial (3rd degree)'
  | 'Exponential'
  | 'Exponential monomial';

/**
 * Line style mapping for chart visualization.
 */
export type LineStyleType = 'solid' | 'dashed' | 'dotted' | 'dash-dot';

/**
 * A single growth model entry from the database.
 */
export interface GrowthModel {
  /** Species scientific name */
  speciesName: string;
  /** Species slug/ID */
  speciesId: string;
  /** X-axis range as string (e.g., "0 to 33") */
  xRange: string;
  /** X-axis unit (dph = days post hatch, hph = hours post hatch) */
  xUnit: string;
  /** Y-axis type (SL = standard length, TL = total length, DW = dry weight) */
  yType: string;
  /** Y-axis unit (mm, cm, um, mg) */
  yUnit: string;
  /** Model type for line style determination */
  modelType: GrowthModelType;
  /** R² goodness of fit */
  modelR2: number | null;
  /** The equation as string */
  equation: string | null;
  /** Model parameters */
  param1: number | null;
  param2: number | null;
  param3: number | null;
  param4: number | null;
  /** Temperature data */
  tempMean: number | null;
  tempMin: number | null;
  tempMax: number | null;
  /** Remarks/notes */
  remarks: string | null;
  /** External reference identifier */
  extRef: string | null;
  /** Reference citation */
  reference: string | null;
  /** DOI or URL */
  link: string | null;
}

/**
 * Parsed X range for generating curve points.
 */
export interface ParsedXRange {
  min: number;
  max: number;
}

/**
 * A point on a growth curve.
 */
export interface GrowthCurvePoint {
  x: number;
  y: number;
}

/**
 * A complete growth curve ready for charting.
 */
export interface GrowthCurve {
  /** Unique ID for this curve */
  id: string;
  /** The underlying model data */
  model: GrowthModel;
  /** Calculated curve points */
  points: GrowthCurvePoint[];
  /** Line style based on model type */
  lineStyle: LineStyleType;
  /** Assigned color for this curve */
  color: string;
}

/**
 * Raw age-at-length data point from the database.
 */
export interface RawGrowthPoint {
  /** Age value */
  age: number;
  /** Length value (null for weight-only rows) */
  length: number | null;
  /** Length type (SL, TL, etc.) */
  lengthType: string;
  /** Weight value (may be null if no weight data) */
  weight: number | null;
  /** Weight type (DW, WW, etc.) */
  weightType: string | null;
  /** Temperature mean */
  tempMean: number | null;
  /** Temperature minimum */
  tempMin: number | null;
  /** Temperature maximum */
  tempMax: number | null;
  /** Sample origin (Wild/Reared) */
  origin: string | null;
  /** Measurement method */
  method: string | null;
  /** Remarks/notes */
  remarks: string | null;
  /** External reference identifier */
  extRef: string | null;
  /** Reference citation */
  reference: string | null;
  /** DOI or URL link */
  link: string | null;
}

/**
 * Point shape types for scatter plots — each reference gets a different shape.
 */
export type PointShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'cross' | 'wye';

/**
 * Ordered list of point shapes to cycle through per reference.
 */
export const POINT_SHAPES: PointShapeType[] = [
  'circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'wye',
];

/**
 * Line dash patterns to cycle through per reference.
 */
export const REFERENCE_LINE_STYLES: string[] = [
  '0',        // solid
  '8 4',      // dashed
  '2 2',      // dotted
  '8 4 2 4',  // dash-dot
  '12 4',     // long dash
  '4 4',      // short dash
  '8 2 2 2 2 2', // dash-dot-dot
];

/**
 * Map MODEL_TYPE to line style.
 */
export function getLineStyleForModelType(modelType: string): LineStyleType {
  switch (modelType) {
    case 'Linear':
    case 'Polynomial (1st degree)':
      return 'solid';
    case 'Polynomial (2nd degree)':
      return 'dashed';
    case 'Polynomial (3rd degree)':
      return 'dash-dot';
    case 'Exponential':
    case 'Exponential monomial':
      return 'dotted';
    default:
      return 'solid';
  }
}

/**
 * Parse X_RANGE string like "0 to 33" or "0 to 200".
 */
export function parseXRange(xRange: string | null): ParsedXRange | null {
  if (!xRange || xRange === 'NA') return null;

  const match = xRange.match(/(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  
  return {
    min: parseFloat(match[1]),
    max: parseFloat(match[2]),
  };
}

/**
 * Color palette for growth curves (legacy fallback).
 */
export const GROWTH_CURVE_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#db2777', // pink
  '#ca8a04', // yellow
  '#4f46e5', // indigo
  '#059669', // emerald
];

/**
 * Spectral color scale stops (ggplot-style) from cool blue to warm red.
 * Maps 18°C–32°C range.
 */
export const SPECTRAL_COLORS = [
  { t: 0.0, color: [69, 117, 180] },  // #4575b4 - cool blue
  { t: 0.25, color: [145, 191, 219] }, // #91bfdb - light blue
  { t: 0.5, color: [254, 224, 139] },  // #fee08b - yellow/green
  { t: 0.75, color: [252, 141, 89] },  // #fc8d59 - orange
  { t: 1.0, color: [215, 48, 39] },    // #d73027 - warm red
] as const;

const TEMP_MIN = 18;
const TEMP_MAX = 32;

/**
 * Interpolate between two RGB colors.
 */
function lerpColor(c1: readonly number[], c2: readonly number[], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

/**
 * Convert RGB to hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Map temperature to Spectral color scale.
 * 18°C = cool blue (#4575b4), 25°C = yellow-green, 32°C = warm red (#d73027).
 * Null temperature returns neutral gray.
 */
export function temperatureToSpectralColor(temp: number | null): string {
  if (temp === null) return '#6b7280';

  // Clamp to range
  const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, temp));
  const t = (clamped - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);

  // Find the two stops to interpolate between
  for (let i = 0; i < SPECTRAL_COLORS.length - 1; i++) {
    const stop1 = SPECTRAL_COLORS[i];
    const stop2 = SPECTRAL_COLORS[i + 1];
    if (t >= stop1.t && t <= stop2.t) {
      const localT = (t - stop1.t) / (stop2.t - stop1.t);
      const [r, g, b] = lerpColor(stop1.color, stop2.color, localT);
      return rgbToHex(r, g, b);
    }
  }

  // Fallback to last stop
  const last = SPECTRAL_COLORS[SPECTRAL_COLORS.length - 1];
  return rgbToHex(last.color[0], last.color[1], last.color[2]);
}

/**
 * Map temperature to Spectral color using a DYNAMIC min/max range.
 * This adapts the full color gradient to the species' own temperature range.
 */
export function temperatureToSpectralColorDynamic(
  temp: number | null,
  rangeMin: number,
  rangeMax: number,
): string {
  if (temp === null) return '#6b7280';
  if (rangeMin >= rangeMax) return temperatureToSpectralColor(temp);

  // Clamp to range
  const clamped = Math.max(rangeMin, Math.min(rangeMax, temp));
  const t = (clamped - rangeMin) / (rangeMax - rangeMin);

  // Find the two stops to interpolate between
  for (let i = 0; i < SPECTRAL_COLORS.length - 1; i++) {
    const stop1 = SPECTRAL_COLORS[i];
    const stop2 = SPECTRAL_COLORS[i + 1];
    if (t >= stop1.t && t <= stop2.t) {
      const localT = (t - stop1.t) / (stop2.t - stop1.t);
      const [r, g, b] = lerpColor(stop1.color, stop2.color, localT);
      return rgbToHex(r, g, b);
    }
  }

  const last = SPECTRAL_COLORS[SPECTRAL_COLORS.length - 1];
  return rgbToHex(last.color[0], last.color[1], last.color[2]);
}
