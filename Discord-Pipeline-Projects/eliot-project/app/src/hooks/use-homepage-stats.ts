"use client";

import { useState, useEffect } from "react";
import type { TraitBarplotStat } from "@/components/homepage/trait-barplots";
import type { PublicationDataPoint } from "@/components/homepage/publication-chart";

interface HomepageStatsState {
  barplotStats: TraitBarplotStat[];
  publicationYears: PublicationDataPoint[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches homepage statistics for barplots and publication chart from the API.
 */
export function useHomepageStats(): HomepageStatsState {
  const [state, setState] = useState<HomepageStatsState>({
    barplotStats: [],
    publicationYears: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/homepage-stats");
        if (!res.ok) throw new Error("Failed to fetch homepage stats");
        const data = await res.json();
        setState({
          barplotStats: data.stats ?? [],
          publicationYears: data.publicationYears ?? [],
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load stats",
        }));
      }
    }

    fetchStats();
  }, []);

  return state;
}
