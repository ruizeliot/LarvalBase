"use client";

import { useState, useEffect } from "react";
import type { TraitBarplotStat } from "@/components/homepage/trait-barplots";
import type { PublicationDataPoint } from "@/components/homepage/publication-chart";
import type { FamilyPhotoData } from "@/components/homepage/photo-grid";

interface HomepageStatsState {
  barplotStats: TraitBarplotStat[];
  imageStats: TraitBarplotStat | null;
  publicationYears: PublicationDataPoint[];
  familyPhotos: FamilyPhotoData[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches homepage statistics for barplots, publication chart, and photo grid.
 */
export function useHomepageStats(): HomepageStatsState {
  const [state, setState] = useState<HomepageStatsState>({
    barplotStats: [],
    imageStats: null,
    publicationYears: [],
    familyPhotos: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, familiesRes] = await Promise.all([
          fetch("/api/homepage-stats"),
          fetch("/api/homepage-stats/families"),
        ]);

        if (!statsRes.ok) throw new Error("Failed to fetch homepage stats");
        if (!familiesRes.ok) throw new Error("Failed to fetch family data");

        const [statsData, familiesData] = await Promise.all([
          statsRes.json(),
          familiesRes.json(),
        ]);

        setState({
          barplotStats: statsData.stats ?? [],
          imageStats: statsData.imageStats ?? null,
          publicationYears: statsData.publicationYears ?? [],
          familyPhotos: familiesData.families ?? [],
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
