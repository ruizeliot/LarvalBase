"use client";

import { useState, useEffect } from "react";
import type { PelagicJuvenileData } from "@/components/species-detail/pelagic-juvenile-panel";

export interface UsePelagicJuvenileReturn {
  data: PelagicJuvenileData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch pelagic juvenile data with species/genus/family cascade.
 */
export function usePelagicJuvenile(speciesId: string | null): UsePelagicJuvenileReturn {
  const [data, setData] = useState<PelagicJuvenileData | null>(null);
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
        const res = await fetch(`/api/species/${speciesId}/pelagic-juvenile`, {
          signal: abortController.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to load pelagic juvenile data");
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
