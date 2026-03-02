"use client";

import { useState, useEffect } from "react";

/**
 * Metadata for raw measurements.
 */
export interface MeasurementMetadata {
  method?: string | null;
  origin?: string | null;
  temperatureMean?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  gear?: string | null;
  location?: string | null;
  country?: string | null;
  remarks?: string | null;
  externalRef?: string | null;
  lengthType?: string | null;
  sampleSize?: number | null;
  /** Minimum value from _MIN column */
  minValue?: number | null;
  /** Maximum value from _MAX column */
  maxValue?: number | null;
  /** Confidence value from _CONF column */
  confValue?: number | null;
  /** Confidence type from _CONF_TYPE column (e.g., "SD", "SE", "CI") */
  confType?: string | null;
  /** All original CSV row fields for database-specific display */
  rawFields?: Record<string, unknown>;
}

/**
 * Raw measurement data from API.
 */
export interface RawMeasurement {
  value: number | null;
  unit: string;
  source: string | null;
  doi: string | null;
  traitType: string;
  metadata?: MeasurementMetadata;
}

/**
 * Return type for useRawData hook.
 */
export interface UseRawDataReturn {
  data: RawMeasurement[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch raw trait data for a species.
 *
 * @param speciesId - Species ID to fetch data for
 * @param traitType - Optional filter for specific trait type
 * @param enabled - Whether to fetch (default true, set false to disable)
 * @returns Raw measurements, loading state, and error state
 */
export function useRawData(
  speciesId: string | null,
  traitType?: string,
  enabled: boolean = true
): UseRawDataReturn {
  const [data, setData] = useState<RawMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if disabled or no speciesId
    if (!enabled || !speciesId) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();

    async function fetchRawData() {
      try {
        const url = traitType
          ? `/api/species/${speciesId}/raw?trait=${encodeURIComponent(traitType)}`
          : `/api/species/${speciesId}/raw`;

        const response = await fetch(url, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Species not found");
          }
          throw new Error("Failed to load raw data");
        }

        const json = await response.json();
        setData(json.measurements || []);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRawData();

    return () => {
      abortController.abort();
    };
  }, [speciesId, traitType, enabled]);

  return { data, isLoading, error };
}
