/**
 * Hook for fetching growth curve data for a species.
 */

import { useState, useEffect } from 'react';
import type { GrowthCurve, RawGrowthPoint } from '@/lib/types/growth.types';

export interface AxisCaps {
  xMax: number | null;
  yMax: number | null;
  level: 'species' | 'genus' | 'family' | null;
}

export interface TempRange {
  min: number;
  max: number;
}

export interface PreviewData {
  columns: string[];
  rows: Array<Record<string, string>>;
}

interface GrowthDataResponse {
  speciesId: string;
  curves: GrowthCurve[];
  weightCurves?: GrowthCurve[];
  rawPoints: RawGrowthPoint[];
  curveCount: number;
  weightCurveCount?: number;
  rawPointCount: number;
  axisCaps?: AxisCaps;
  tempRange?: TempRange | null;
  rawExport?: Array<Record<string, unknown>>;
  modelExport?: Array<Record<string, unknown>>;
  ageAtLengthPreview?: PreviewData;
  growthModelPreview?: PreviewData;
}

interface UseGrowthDataResult {
  curves: GrowthCurve[];
  weightCurves: GrowthCurve[];
  rawPoints: RawGrowthPoint[];
  axisCaps: AxisCaps | null;
  tempRange: TempRange | null;
  rawExport: Array<Record<string, unknown>>;
  modelExport: Array<Record<string, unknown>>;
  ageAtLengthPreview: PreviewData;
  growthModelPreview: PreviewData;
  isLoading: boolean;
  error: string | null;
}

export function useGrowthData(speciesId: string): UseGrowthDataResult {
  const [curves, setCurves] = useState<GrowthCurve[]>([]);
  const [weightCurves, setWeightCurves] = useState<GrowthCurve[]>([]);
  const [rawPoints, setRawPoints] = useState<RawGrowthPoint[]>([]);
  const [axisCaps, setAxisCaps] = useState<AxisCaps | null>(null);
  const [tempRange, setTempRange] = useState<TempRange | null>(null);
  const [rawExport, setRawExport] = useState<Array<Record<string, unknown>>>([]);
  const [modelExport, setModelExport] = useState<Array<Record<string, unknown>>>([]);
  const [ageAtLengthPreview, setAgeAtLengthPreview] = useState<PreviewData>({ columns: [], rows: [] });
  const [growthModelPreview, setGrowthModelPreview] = useState<PreviewData>({ columns: [], rows: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!speciesId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchGrowthData() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/species/${speciesId}/growth`);

        if (!res.ok) {
          throw new Error(`Failed to fetch growth data: ${res.status}`);
        }

        const data: GrowthDataResponse = await res.json();

        if (!cancelled) {
          setCurves(data.curves);
          setWeightCurves(data.weightCurves || []);
          setRawPoints(data.rawPoints);
          setAxisCaps(data.axisCaps || null);
          setTempRange(data.tempRange || null);
          setRawExport(data.rawExport || []);
          setModelExport(data.modelExport || []);
          setAgeAtLengthPreview(data.ageAtLengthPreview || { columns: [], rows: [] });
          setGrowthModelPreview(data.growthModelPreview || { columns: [], rows: [] });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setCurves([]);
          setWeightCurves([]);
          setRawPoints([]);
          setAxisCaps(null);
          setTempRange(null);
          setRawExport([]);
          setModelExport([]);
          setAgeAtLengthPreview({ columns: [], rows: [] });
          setGrowthModelPreview({ columns: [], rows: [] });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchGrowthData();

    return () => {
      cancelled = true;
    };
  }, [speciesId]);

  return { curves, weightCurves, rawPoints, axisCaps, tempRange, rawExport, modelExport, ageAtLengthPreview, growthModelPreview, isLoading, error };
}
