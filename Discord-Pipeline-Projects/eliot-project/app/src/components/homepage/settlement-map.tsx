"use client";

import { useState, useEffect, lazy, Suspense } from "react";

const LeafletMap = lazy(() => import("@/components/map/leaflet-map"));

interface SettlementLocation {
  latitude: number;
  longitude: number;
  location: string | null;
  country: string | null;
  year: number | null;
  traitType: string | null;
  value: number | null;
  unit: string | null;
  reference: string | null;
  link: string | null;
}

/**
 * Homepage settlement map showing all settlement GPS records worldwide.
 */
export function HomepageSettlementMap() {
  const [locations, setLocations] = useState<SettlementLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/homepage-stats/settlement-map");
        if (!res.ok) throw new Error("Failed to load settlement map");
        const data = await res.json();
        setLocations(data.locations ?? []);
      } catch (error) {
        console.error("Settlement map load error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLocations();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Settlement-stage sampling locations
        </h3>
        <div className="h-[300px] bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (locations.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Settlement-stage sampling locations
      </h3>
      <Suspense fallback={<div className="h-[300px] bg-muted rounded-lg animate-pulse" />}>
        <LeafletMap locations={locations} />
      </Suspense>
    </div>
  );
}
