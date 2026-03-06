"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoGraticule, type GeoPermissibleObjects } from "d3-geo";
// @ts-expect-error d3-geo-projection has no type declarations
import { geoRobinson } from "d3-geo-projection";

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom/pan state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 450 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const BASE_WIDTH = 900;
  const BASE_HEIGHT = 450;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 8;

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
    setViewBox({ x: 0, y: 0, w: BASE_WIDTH, h: BASE_HEIGHT });
  }, [family]); // eslint-disable-line react-hooks/exhaustive-deps

  // Robinson projection
  const projection = useMemo(
    () =>
      geoRobinson()
        .scale(150)
        .translate([BASE_WIDTH / 2, BASE_HEIGHT / 2])
        .precision(0.1),
    []
  );

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);
  const graticule = useMemo(() => geoGraticule().step([30, 30])(), []);

  // Color scale — linear scale adapted to this family's min/max
  const { minCount, maxCount } = useMemo(() => {
    if (!provinceData) return { minCount: 0, maxCount: 1 };
    const counts = Object.values(provinceData.provinces)
      .map((p) => p.count)
      .filter((c) => c > 0);
    if (counts.length === 0) return { minCount: 0, maxCount: 1 };
    return {
      minCount: Math.min(...counts),
      maxCount: Math.max(...counts),
    };
  }, [provinceData]);

  // Blue-to-red color scale for province counts
  const colorScale = useCallback(
    (count: number): string => {
      if (count === 0) return "none";
      if (maxCount === minCount) return "#4393c3"; // single value = medium blue
      const t = (count - minCount) / (maxCount - minCount);
      // Interpolate: light blue (#92c5de) -> medium blue (#4393c3) -> dark blue (#2166ac) -> orange (#f4a582) -> red (#d6604d)
      const colors = ["#92c5de", "#4393c3", "#2166ac", "#f4a582", "#d6604d"];
      const idx = t * (colors.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, colors.length - 1);
      const frac = idx - lo;
      // Simple hex interpolation
      const c1 = hexToRgb(colors[lo]);
      const c2 = hexToRgb(colors[hi]);
      const r = Math.round(c1.r + (c2.r - c1.r) * frac);
      const g = Math.round(c1.g + (c2.g - c1.g) * frac);
      const b = Math.round(c1.b + (c2.b - c1.b) * frac);
      return `rgb(${r},${g},${b})`;
    },
    [minCount, maxCount]
  );

  // Province names sorted for dropdown
  const sortedProvinceNames = useMemo(() => {
    if (!geoData) return [];
    return geoData.features
      .map((f) => f.properties.PROVINCE)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  }, [geoData]);

  const handleProvinceClick = useCallback(
    (provinceName: string) => {
      if (selectedProvince === provinceName) {
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

  const handleDropdownChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === "") {
        setSelectedProvince(null);
        onFilterSpecies?.(null);
      } else {
        setSelectedProvince(val);
        const speciesInProvince = provinceData?.provinces[val]?.species ?? [];
        onFilterSpecies?.(new Set(speciesInProvince));
      }
    },
    [provinceData, onFilterSpecies]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, provinceName: string) => {
      if (isPanning) return;
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        setTooltipPos({
          x: e.clientX - svgRect.left,
          y: e.clientY - svgRect.top,
        });
      }
      setHoveredProvince(provinceName);
    },
    [isPanning]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredProvince(null);
    setTooltipPos(null);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.18;
      const newW = Math.max(BASE_WIDTH / MAX_ZOOM, Math.min(BASE_WIDTH / MIN_ZOOM, viewBox.w * zoomFactor));
      const newH = (newW / BASE_WIDTH) * BASE_HEIGHT;

      // Zoom toward cursor
      const mx = ((e.clientX - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x;
      const my = ((e.clientY - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y;
      const newX = mx - ((e.clientX - svgRect.left) / svgRect.width) * newW;
      const newY = my - ((e.clientY - svgRect.top) / svgRect.height) * newH;

      setViewBox({ x: newX, y: newY, w: newW, h: newH });
    },
    [viewBox]
  );

  // Pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    },
    [viewBox.x, viewBox.y]
  );

  const handleMouseMovePan = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || !panStart.current || !svgRef.current) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      const dx = ((e.clientX - panStart.current.x) / svgRect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.current.y) / svgRect.height) * viewBox.h;
      setViewBox((prev) => ({ ...prev, x: panStart.current!.vx - dx, y: panStart.current!.vy - dy }));
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">
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
        {/* Province dropdown */}
        <select
          className="text-xs bg-card border border-border rounded px-2 py-1 text-foreground max-w-[220px]"
          value={selectedProvince ?? ""}
          onChange={handleDropdownChange}
        >
          <option value="">All provinces</option>
          {sortedProvinceNames.map((name) => {
            const data = provinceData.provinces[name];
            const count = data?.count ?? 0;
            return (
              <option key={name} value={name}>
                {name} ({count} spp.)
              </option>
            );
          })}
        </select>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-border/50"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); handleMouseLeave(); }}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full"
          style={{ maxHeight: "400px", cursor: isPanning ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMovePan}
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

          {/* Province polygons */}
          {geoData.features.map((feature, i) => {
            const provinceName = feature.properties.PROVINCE;
            const data = provinceData.provinces[provinceName];
            const count = data?.count ?? 0;
            const isSelected = selectedProvince === provinceName;
            const isHovered = hoveredProvince === provinceName;

            const fill = colorScale(count);

            return (
              <path
                key={i}
                d={pathGenerator(feature.geometry as GeoJSON.Geometry) || ""}
                fill={fill}
                fillOpacity={count === 0 ? 0 : 0.75}
                stroke={
                  isSelected
                    ? "#60a5fa"
                    : isHovered
                      ? "rgba(255,255,255,0.8)"
                      : "rgba(200,200,200,0.25)"
                }
                strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.3}
                style={{ cursor: count > 0 ? "pointer" : "grab" }}
                pointerEvents="all"
                onClick={(e) => {
                  if (isPanning) return;
                  // Only fire click if mouse didn't move much (not a pan)
                  if (count > 0) {
                    e.stopPropagation();
                    handleProvinceClick(provinceName);
                  }
                }}
                onMouseMove={(e) => handleMouseMove(e, provinceName)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Land masses (GSHHS coastline) */}
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
        {hoveredProvince && tooltipPos && !isPanning && (
          <div
            className="absolute pointer-events-none bg-black/90 border border-white/20 rounded px-2 py-1 text-xs text-white z-10"
            style={{
              left: tooltipPos.x + 10,
              top: tooltipPos.y - 30,
              transform: tooltipPos.x > 600 ? "translateX(-110%)" : undefined,
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
            <span>{minCount}</span>
            <div
              className="w-20 h-2 rounded-sm"
              style={{
                background: `linear-gradient(to right, ${colorScale(minCount)}, ${colorScale(Math.round((minCount + maxCount) / 2))}, ${colorScale(maxCount)})`,
              }}
            />
            <span>{maxCount}</span>
            <span className="ml-1">spp.</span>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-sm flex items-center justify-center"
            onClick={() => {
              setViewBox((prev) => {
                const newW = Math.max(BASE_WIDTH / MAX_ZOOM, prev.w * 0.75);
                const newH = (newW / BASE_WIDTH) * BASE_HEIGHT;
                const cx = prev.x + prev.w / 2;
                const cy = prev.y + prev.h / 2;
                return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
              });
            }}
          >
            +
          </button>
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-sm flex items-center justify-center"
            onClick={() => {
              setViewBox((prev) => {
                const newW = Math.min(BASE_WIDTH, prev.w * 1.33);
                const newH = (newW / BASE_WIDTH) * BASE_HEIGHT;
                const cx = prev.x + prev.w / 2;
                const cy = prev.y + prev.h / 2;
                return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
              });
            }}
          >
            −
          </button>
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-[9px] flex items-center justify-center"
            title="Reset zoom"
            onClick={() => setViewBox({ x: 0, y: 0, w: BASE_WIDTH, h: BASE_HEIGHT })}
          >
            ↺
          </button>
        </div>
      </div>

      {selectedProvince && (
        <p className="text-xs text-blue-400 mt-1">
          Filtered: {selectedProvince} ({provinceData.provinces[selectedProvince]?.count ?? 0} species)
        </p>
      )}
    </div>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}
