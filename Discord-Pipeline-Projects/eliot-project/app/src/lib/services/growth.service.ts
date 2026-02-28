/**
 * Growth model service for parsing and evaluating growth curves.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  GrowthModel,
  GrowthCurve,
  GrowthCurvePoint,
  RawGrowthPoint,
} from '@/lib/types/growth.types';
import {
  parseXRange,
  getLineStyleForModelType,
  GROWTH_CURVE_COLORS,
  temperatureToSpectralColor,
} from '@/lib/types/growth.types';

// Cache for parsed growth models
let growthModelsCache: GrowthModel[] | null = null;
// Cache for raw growth data
let rawGrowthDataCache: Map<string, RawGrowthPoint[]> | null = null;

/**
 * Slugify species name for ID matching.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Parse numeric value from string or number.
 */
function parseNum(value: unknown): number | null {
  if (value === null || value === undefined || value === 'NA' || value === '') {
    return null;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

/**
 * Parse the growth model parameters database.
 */
export async function loadGrowthModels(): Promise<GrowthModel[]> {
  if (growthModelsCache) {
    return growthModelsCache;
  }

  const dbPath = path.join(
    process.cwd(),
    'database',
    'Growth model parameters database final 06.2025.txt'
  );

  try {
    const content = await fs.readFile(dbPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return [];
    }

    // Parse header - columns are @-delimited and quoted
    const headerLine = lines[0];
    const headers = headerLine.split('@').map(h => h.replace(/^"|"$/g, '').trim());
    
    const models: GrowthModel[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split('@').map(v => v.replace(/^"|"$/g, '').trim());
      
      // Create a row object
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const speciesName = row['VALID_NAME'] || '';
      if (!speciesName) continue;

      const model: GrowthModel = {
        speciesName,
        speciesId: slugify(speciesName),
        xRange: row['X_RANGE'] || '',
        xUnit: row['X_UNIT'] || 'dph',
        yType: row['Y_TYPE'] || 'SL',
        yUnit: row['Y_UNIT'] || 'mm',
        modelType: (row['MODEL_TYPE'] || 'Linear') as GrowthModel['modelType'],
        modelR2: parseNum(row['MODEL_R2']),
        equation: row['EQUATION'] || null,
        param1: parseNum(row['PARAMETER_1']),
        param2: parseNum(row['PARAMETER_2']),
        param3: parseNum(row['PARAMETER_3']),
        param4: parseNum(row['PARAMETER_4']),
        tempMean: parseNum(row['TEMPERATURE_MEAN']),
        tempMin: parseNum(row['TEMPERATURE_MIN']),
        tempMax: parseNum(row['TEMPERATURE_MAX']),
        remarks: row['REMARKS'] || null,
        reference: row['REFERENCE'] || null,
        link: row['LINK'] || null,
      };

      models.push(model);
    }

    growthModelsCache = models;
    return models;
  } catch (error) {
    console.error('Failed to load growth models:', error);
    return [];
  }
}

/**
 * Get growth models for a specific species.
 */
export async function getGrowthModelsForSpecies(
  speciesId: string
): Promise<GrowthModel[]> {
  const allModels = await loadGrowthModels();
  return allModels.filter(m => m.speciesId === speciesId);
}

/**
 * Load raw age-at-length data from the larval growth database.
 */
export async function loadRawGrowthData(): Promise<Map<string, RawGrowthPoint[]>> {
  if (rawGrowthDataCache) {
    return rawGrowthDataCache;
  }

  const dbPath = path.join(
    process.cwd(),
    'database',
    'Larval age-length data final 06.2025.txt'
  );

  const dataBySpecies = new Map<string, RawGrowthPoint[]>();

  try {
    const content = await fs.readFile(dbPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return dataBySpecies;
    }

    // Parse header
    const headers = lines[0].split('@').map(h => h.replace(/^"|"$/g, '').trim());
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split('@').map(v => v.replace(/^"|"$/g, '').trim());
      
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const speciesName = row['VALID_NAME'] || '';
      if (!speciesName) continue;

      const age = parseNum(row['AGE']);
      const length = parseNum(row['LENGTH']);
      
      if (age === null || length === null) continue;

      const speciesId = slugify(speciesName);
      const point: RawGrowthPoint = {
        age,
        length,
        lengthType: row['LENGTH_TYPE'] || 'SL',
        tempMean: parseNum(row['TEMPERATURE_MEAN']),
        reference: row['REFERENCE'] || null,
      };

      const existing = dataBySpecies.get(speciesId) || [];
      existing.push(point);
      dataBySpecies.set(speciesId, existing);
    }

    rawGrowthDataCache = dataBySpecies;
    return dataBySpecies;
  } catch (error) {
    console.error('Failed to load raw growth data:', error);
    return dataBySpecies;
  }
}

/**
 * Get raw growth points for a species.
 */
export async function getRawGrowthPointsForSpecies(
  speciesId: string
): Promise<RawGrowthPoint[]> {
  const allData = await loadRawGrowthData();
  return allData.get(speciesId) || [];
}

/**
 * Evaluate a growth model equation at a given X value.
 */
export function evaluateGrowthModel(model: GrowthModel, x: number): number | null {
  const { modelType, param1, param2, param3, param4 } = model;
  
  if (param1 === null) return null;

  try {
    switch (modelType) {
      case 'Linear':
      case 'Polynomial (1st degree)':
        // Y = a + b*X
        if (param2 === null) return null;
        return param1 + param2 * x;

      case 'Polynomial (2nd degree)':
        // Y = a + b*X + c*X^2
        if (param2 === null || param3 === null) return null;
        return param1 + param2 * x + param3 * x * x;

      case 'Polynomial (3rd degree)':
        // Y = a + b*X + c*X^2 + d*X^3
        if (param2 === null || param3 === null || param4 === null) return null;
        return param1 + param2 * x + param3 * x * x + param4 * x * x * x;

      case 'Exponential':
        // Y = a * exp(b * X)
        if (param2 === null) return null;
        return param1 * Math.exp(param2 * x);

      case 'Exponential monomial':
        // Y = 10^(a + b*X)
        if (param2 === null) return null;
        return Math.pow(10, param1 + param2 * x);

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Generate curve points for a growth model.
 */
export function generateCurvePoints(
  model: GrowthModel,
  numPoints: number = 50
): GrowthCurvePoint[] {
  const range = parseXRange(model.xRange);
  if (!range) return [];

  const points: GrowthCurvePoint[] = [];
  const step = (range.max - range.min) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = range.min + step * i;
    const y = evaluateGrowthModel(model, x);
    
    if (y !== null && isFinite(y) && y >= 0) {
      points.push({ x, y });
    }
  }

  return points;
}

/**
 * Build growth curves with styling for a species.
 */
export async function getGrowthCurvesForSpecies(
  speciesId: string
): Promise<GrowthCurve[]> {
  const models = await getGrowthModelsForSpecies(speciesId);
  
  return models.map((model, index) => {
    const id = `${model.speciesId}-${index}`;
    const points = generateCurvePoints(model);
    const lineStyle = getLineStyleForModelType(model.modelType);
    // Use Spectral color scale based on temperature; fall back to palette if no temp
    const color = model.tempMean !== null
      ? temperatureToSpectralColor(model.tempMean)
      : GROWTH_CURVE_COLORS[index % GROWTH_CURVE_COLORS.length];

    return {
      id,
      model,
      points,
      lineStyle,
      color,
    };
  });
}

/**
 * Get complete growth data for a species (curves + raw points).
 */
export async function getGrowthDataForSpecies(
  speciesId: string
): Promise<{ curves: GrowthCurve[]; rawPoints: RawGrowthPoint[] }> {
  const [curves, rawPoints] = await Promise.all([
    getGrowthCurvesForSpecies(speciesId),
    getRawGrowthPointsForSpecies(speciesId),
  ]);
  
  return { curves, rawPoints };
}
