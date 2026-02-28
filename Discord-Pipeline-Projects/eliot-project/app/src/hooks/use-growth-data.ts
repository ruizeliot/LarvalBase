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

interface GrowthDataResponse {
  speciesId: string;
  curves: GrowthCurve[];
  rawPoints: RawGrowthPoint[];
  curveCount: number;
  rawPointCount: number;
  axisCaps?: AxisCaps;
  tempRange?: TempRange | null;
  rawExport?: Array<Record<string, unknown>>;
  modelExport?: Array<Record<string, unknown>>;
}

interface UseGrowthDataResult {
  curves: GrowthCurve[];
  rawPoints: RawGrowthPoint[];
  axisCaps: AxisCaps | null;
  tempRange: TempRange | null;
  rawExport: Array<Record<string, unknown>>;
  modelExport: Array<Record<string, unknown>>;
  isLoading: boolean;
  error: string | null;
}

export function useGrowthData(speciesId: string): UseGrowthDataResult {
  const [curves, setCurves] = useState<GrowthCurve[]>([]);
  const [rawPoints, setRawPoints] = useState<RawGrowthPoint[]>([]);
  const [axisCaps, setAxisCaps] = useState<AxisCaps | null>(null);
  const [tempRange, setTempRange] = useState<TempRange | null>(null);
  const [rawExport, setRawExport] = useState<Array<Record<string, unknown>>>([]);
  const [modelExport, setModelExport] = useState<Array<Record<string, unknown>>>([]);
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
          setRawPoints(data.rawPoints);
          setAxisCaps(data.axisCaps || null);
          setTempRange(data.tempRange || null);
          setRawExport(data.rawExport || []);
          setModelExport(data.modelExport || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setCurves([]);
          setRawPoints([]);
          setAxisCaps(null);
          setTempRange(null);
          setRawExport([]);
          setModelExport([]);
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

  return { curves, rawPoints, axisCaps, tempRange, rawExport, modelExport, isLoading, error };
}
