"use client";

import { useState, useEffect } from "react";
import type { EggQualitativeData } from "@/components/species-detail/egg-qualitative-panel";

export interface UseEggQualitativeReturn {
  data: EggQualitativeData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch qualitative egg trait data with species/genus/family cascade.
 */
export function useEggQualitative(speciesId: string | null): UseEggQualitativeReturn {
  const [data, setData] = useState<EggQualitativeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!speciesId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();

    async function fetchData() {
      try {
        const res = await fetch(`/api/species/${speciesId}/egg-qualitative`, {
          signal: abortController.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to load qualitative egg data");
        }

        const json = await res.json();
        setData(json.data ?? null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [speciesId]);

  return { data, isLoading, error };
}
