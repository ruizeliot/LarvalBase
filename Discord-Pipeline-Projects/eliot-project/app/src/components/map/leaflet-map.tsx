"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface LocationWithMetadata {
  latitude: number;
  longitude: number;
  location?: string | null;
  country?: string | null;
  year?: number | null;
  unit?: string | null;
  externalRef?: string | null;
  reference?: string | null;
  link?: string | null;
  traitType?: string | null;
  value?: number | null;
}

interface LeafletMapProps {
  locations: LocationWithMetadata[];
}

/**
 * Get marker color based on year using a sequential color scale.
 * Earlier years are blue, recent years are red.
 */
function getYearColor(year: number | null | undefined, minYear: number, maxYear: number): string {
  if (year === null || year === undefined) {
    return "#6b7280"; // Gray for unknown year
  }
  
  // Normalize year to 0-1 range
  const range = maxYear - minYear;
  if (range === 0) {
    return "#00A8E8"; // Accent color if all same year
  }
  
  const normalized = (year - minYear) / range;
  
  // Sequential color scale: blue (old) → cyan → yellow → orange → red (recent)
  if (normalized < 0.25) {
    return "#3b82f6"; // Blue
  } else if (normalized < 0.5) {
    return "#06b6d4"; // Cyan
  } else if (normalized < 0.75) {
    return "#eab308"; // Yellow
  } else {
    return "#ef4444"; // Red
  }
}

/**
 * Create a colored circle marker icon.
 */
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

/**
 * Grouped location with multiple trait values at the same GPS point.
 */
interface GroupedLocation {
  latitude: number;
  longitude: number;
  location: string | null;
  country: string | null;
  year: number | null;
  traits: Array<{
    traitType: string;
    value: number;
    unit: string;
  }>;
  reference: string | null;
  link: string | null;
}

/**
 * Group locations by GPS coordinates to show all traits from same point.
 */
function groupLocationsByCoordinates(locations: LocationWithMetadata[]): GroupedLocation[] {
  const groups = new Map<string, GroupedLocation>();
  
  for (const loc of locations) {
    // Create key from rounded coordinates (to handle slight variations)
    const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        location: loc.location ?? null,
        country: loc.country ?? null,
        year: loc.year ?? null,
        traits: [],
        reference: loc.reference ?? null,
        link: loc.link ?? null,
      });
    }
    
    const group = groups.get(key)!;
    
    // Add trait if has value
    if (loc.value !== null && loc.value !== undefined && loc.traitType) {
      // Check if trait already exists (avoid duplicates)
      const existingTrait = group.traits.find(t => t.traitType === loc.traitType);
      if (!existingTrait) {
        group.traits.push({
          traitType: loc.traitType,
          value: loc.value,
          unit: loc.unit ?? "",
        });
      }
    }
    
    // Update year if not set
    if (!group.year && loc.year) {
      group.year = loc.year;
    }
    
    // Update reference if not set
    if (!group.reference && loc.reference) {
      group.reference = loc.reference;
      group.link = loc.link ?? null;
    }
  }
  
  return Array.from(groups.values());
}

/**
 * Build popup content with full metadata, showing all traits from same location.
 */
function buildPopupContent(loc: GroupedLocation): string {
  const lines: string[] = [];
  
  // Location header with " - " separator between location and country
  if (loc.location && loc.country) {
    lines.push(`<strong>${loc.location}</strong> - <span style="color: #9ca3af;">${loc.country}</span>`);
  } else if (loc.location) {
    lines.push(`<strong>${loc.location}</strong>`);
  } else if (loc.country) {
    lines.push(`<span style="color: #9ca3af;">${loc.country}</span>`);
  }
  
  // All trait values from this location
  if (loc.traits.length > 0) {
    lines.push(`<div style="margin-top: 8px;">`);
    for (const trait of loc.traits) {
      const traitName = trait.traitType.replace(/_/g, " ");
      const traitLabel = `Mean ${traitName}`;
      lines.push(`<div><strong>${traitLabel}:</strong> ${trait.value.toFixed(2)}${trait.unit ? ` ${trait.unit}` : ""}</div>`);
    }
    lines.push(`</div>`);
  }
  
  // Year
  if (loc.year) {
    lines.push(`<div><strong>Year:</strong> ${loc.year}</div>`);
  }
  
  // Coordinates
  lines.push(`<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</div>`);
  
  // Reference (if available)
  if (loc.reference) {
    const refText = loc.reference.length > 50 ? loc.reference.slice(0, 50) + "..." : loc.reference;
    if (loc.link) {
      lines.push(`<div style="margin-top: 8px; font-size: 11px;"><a href="${loc.link}" target="_blank" rel="noopener" style="color: #00A8E8;">${refText}</a></div>`);
    } else {
      lines.push(`<div style="margin-top: 8px; font-size: 11px; color: #9ca3af;">${refText}</div>`);
    }
  }
  
  return lines.join("");
}

function LeafletMap({ locations }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Calculate year range for color scale
  const { minYear, maxYear, hasYearData } = useMemo(() => {
    const years = locations
      .map((loc) => loc.year)
      .filter((y): y is number => y !== null && y !== undefined);
    
    if (years.length === 0) {
      return { minYear: 2000, maxYear: 2025, hasYearData: false };
    }
    
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
      hasYearData: true,
    };
  }, [locations]);

  useEffect(() => {
    // Don't initialize if container doesn't exist or map already exists
    if (!containerRef.current || mapRef.current) {
      return;
    }

    // Create map instance (center/zoom will be set by fitBounds below)
    // Allow free panning/wrapping — points are replicated across the dateline
    const map = L.map(containerRef.current, {
      center: [0, 0],
      zoom: 2,
      scrollWheelZoom: false,
      worldCopyJump: true,
    });

    // Use fitBounds to auto-zoom to show ALL markers.
    // This fixes the bug where species with locations spanning both the Pacific
    // and Australia (e.g., Acanthurus olivaceus with Lizard Island at lon 145
    // and Pacific locations at lon -150) would center on the Pacific average,
    // hiding the Australian markers off-screen at fixed zoom 3.
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }

    mapRef.current = map;

    // Base layers — tiles wrap naturally so the map is continuous
    const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      maxZoom: 19,
    });
    
    // Add satellite by default (as requested)
    satelliteLayer.addTo(map);
    
    // Layer control
    const baseLayers = {
      "Satellite": satelliteLayer,
      "Dark": darkLayer,
    };
    L.control.layers(baseLayers, {}, { position: 'topright' }).addTo(map);

    // Group locations by GPS coordinates to combine traits
    const groupedLocations = groupLocationsByCoordinates(locations);

    // Add markers with year-based colors, replicated across dateline
    groupedLocations.forEach((loc) => {
      const color = getYearColor(loc.year, minYear, maxYear);
      const popupContent = buildPopupContent(loc);

      // Place marker at original position and at ±360° longitude
      // so points are always visible when panning across the dateline
      const longitudes = [loc.longitude, loc.longitude - 360, loc.longitude + 360];
      for (const lng of longitudes) {
        const icon = createColoredIcon(color);
        const marker = L.marker([loc.latitude, lng], { icon }).addTo(map);
        marker.bindPopup(popupContent, {
          className: "dark-popup",
          maxWidth: 300,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations, minYear, maxYear]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{ height: "300px", width: "100%" }}
        className="rounded-lg z-0"
      />
      
      {/* Year legend (only if year data exists) */}
      {hasYearData && (
        <div className="absolute bottom-2 right-2 bg-black/80 rounded px-2 py-1 text-xs z-10">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-muted-foreground">Year:</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
            <span className="text-muted-foreground">{minYear}</span>
            <div className="w-8 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 via-yellow-500 to-red-500 rounded mx-1" />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            <span className="text-muted-foreground">{maxYear}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6b7280" }} />
            <span className="text-muted-foreground">Unknown</span>
          </div>
        </div>
      )}
    </div>
  );
}

// MUST use default export for dynamic import
export default LeafletMap;
