"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoGraticule, type GeoPermissibleObjects } from "d3-geo";
// @ts-expect-error d3-geo-projection has no type declarations
import { geoRobinson } from "d3-geo-projection";
import { scaleSqrt } from "d3-scale";
import { interpolateYlOrRd } from "d3-scale-chromatic";

interface ProvinceData {
  count: number;
  species: string[];
}

interface ProvinceMapProps {
  family: string;
  /** Called when user clicks a province — passes species names in that province, or null to clear */
  onFilterSpecies?: (speciesNames: Set<string> | null) => void;
}

interface GeoFeature {
  type: string;
  properties: { PROVINCE: string; REALM: string };
  geometry: GeoJSON.Geometry;
}

interface GeoFeatureCollection {
  type: string;
  features: GeoFeature[];
}

interface ProvinceResponse {
  family: string;
  provinces: Record<string, ProvinceData>;
  totalSpecies: number;
}

export function ProvinceMap({ family, onFilterSpecies }: ProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<ProvinceResponse | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const WIDTH = 900;
  const HEIGHT = 450;

  // Load GeoJSON, land, and province data
  useEffect(() => {
    fetch("/data/spalding_provinces.geojson", { cache: "force-cache" })
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);

    fetch("/data/gshhs_coastline.geojson", { cache: "force-cache" })
      .then((r) => r.json())
      .then(setLandData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/families/${encodeURIComponent(family)}/provinces`)
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(console.error);
  }, [family]);

  // Reset selection when family changes
  useEffect(() => {
    setSelectedProvince(null);
    onFilterSpecies?.(null);
  }, [family]); // eslint-disable-line react-hooks/exhaustive-deps

  // Robinson projection
  const projection = useMemo(
    () =>
      geoRobinson()
        .scale(150)
        .translate([WIDTH / 2, HEIGHT / 2])
        .precision(0.1),
    []
  );

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);
  const graticule = useMemo(() => geoGraticule().step([30, 30])(), []);

  // Color scale — use sqrt scale so low counts are still visible
  const maxCount = useMemo(() => {
    if (!provinceData) return 1;
    const counts = Object.values(provinceData.provinces).map((p) => p.count);
    return Math.max(1, ...counts);
  }, [provinceData]);

  const colorScale = useMemo(
    () => scaleSqrt<string>()
      .domain([1, maxCount])
      .range(["#fee08b", "#d73027"]),
    [maxCount]
  );

  const handleProvinceClick = useCallback(
    (provinceName: string) => {
      if (selectedProvince === provinceName) {
        // Deselect
        setSelectedProvince(null);
        onFilterSpecies?.(null);
      } else {
        setSelectedProvince(provinceName);
        const speciesInProvince = provinceData?.provinces[provinceName]?.species ?? [];
        onFilterSpecies?.(new Set(speciesInProvince));
      }
    },
    [selectedProvince, provinceData, onFilterSpecies]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, provinceName: string) => {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        setTooltipPos({
          x: e.clientX - svgRect.left,
          y: e.clientY - svgRect.top,
        });
      }
      setHoveredProvince(provinceName);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredProvince(null);
    setTooltipPos(null);
  }, []);

  if (!geoData || !provinceData) {
    return (
      <div className="w-full h-[300px] bg-[#1a1a2e] rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading distribution map...</span>
      </div>
    );
  }

  const hoveredData = hoveredProvince ? provinceData.provinces[hoveredProvince] : null;

  return (
    <div className="relative w-full">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Species distribution by marine province
        {selectedProvince && (
          <button
            className="ml-2 text-xs text-blue-400 hover:text-blue-300"
            onClick={() => {
              setSelectedProvince(null);
              onFilterSpecies?.(null);
            }}
          >
            (clear filter)
          </button>
        )}
      </h3>
      <div className="relative overflow-hidden rounded-lg border border-border/50">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          style={{ maxHeight: "400px" }}
        >
          {/* Ocean background (sphere) */}
          <path
            d={pathGenerator({ type: "Sphere" } as unknown as GeoPermissibleObjects) || ""}
            fill="#1a1a2e"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.5}
          />

          {/* Graticule */}
          <path
            d={pathGenerator(graticule) || ""}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />

          {/* Province polygons — rendered BEFORE land so land sits on top visually for coastlines */}
          {geoData.features.map((feature, i) => {
            const provinceName = feature.properties.PROVINCE;
            const data = provinceData.provinces[provinceName];
            const count = data?.count ?? 0;
            const isSelected = selectedProvince === provinceName;
            const isHovered = hoveredProvince === provinceName;

            // 0-count provinces are fully transparent
            const fill = count === 0 ? "none" : colorScale(count);

            return (
              <path
                key={i}
                d={pathGenerator(feature.geometry as GeoJSON.Geometry) || ""}
                fill={fill}
                fillOpacity={count === 0 ? 0 : 0.8}
                stroke={
                  isSelected
                    ? "#60a5fa"
                    : isHovered
                      ? "rgba(255,255,255,0.8)"
                      : count > 0
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(255,255,255,0.06)"
                }
                strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.3}
                style={{ cursor: count > 0 ? "pointer" : "default" }}
                pointerEvents="all"
                onClick={() => count > 0 && handleProvinceClick(provinceName)}
                onMouseMove={(e) => handleMouseMove(e, provinceName)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Land masses (GSHHS coastline) — on top of provinces, no pointer events */}
          {landData?.features.map((feature, i) => (
            <path
              key={`land-${i}`}
              d={pathGenerator(feature.geometry as GeoJSON.Geometry) || ""}
              fill="#e8e8e8"
              stroke="rgba(180,180,180,0.5)"
              strokeWidth={0.3}
              pointerEvents="none"
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredProvince && tooltipPos && (
          <div
            className="absolute pointer-events-none bg-black/90 border border-white/20 rounded px-2 py-1 text-xs text-white z-10"
            style={{
              left: tooltipPos.x + 10,
              top: tooltipPos.y - 30,
              transform: tooltipPos.x > WIDTH * 0.7 ? "translateX(-110%)" : undefined,
            }}
          >
            <div className="font-medium">{hoveredProvince}</div>
            <div className="text-white/70">
              {hoveredData ? `${hoveredData.count} species` : "No species"}
            </div>
          </div>
        )}

        {/* Color legend */}
        {maxCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white/60 bg-black/50 rounded px-1.5 py-0.5">
            <span>1</span>
            <div
              className="w-20 h-2 rounded-sm"
              style={{
                background: `linear-gradient(to right, ${colorScale(1)}, ${colorScale(Math.sqrt(maxCount))}, ${colorScale(maxCount)})`,
              }}
            />
            <span>{maxCount}</span>
            <span className="ml-1">spp.</span>
          </div>
        )}
      </div>

      {selectedProvince && (
        <p className="text-xs text-blue-400 mt-1">
          Filtered: {selectedProvince} ({provinceData.provinces[selectedProvince]?.count ?? 0} species)
        </p>
      )}
    </div>
  );
}
