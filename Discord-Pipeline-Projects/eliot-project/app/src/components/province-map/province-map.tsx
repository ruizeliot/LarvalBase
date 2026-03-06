"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoGraticule, type GeoPermissibleObjects } from "d3-geo";
// @ts-expect-error d3-geo-projection has no type declarations
import { geoRobinson } from "d3-geo-projection";

/** Categorical color palette for provinces */
const PROVINCE_COLORS = [
  '#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462',
  '#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f',
  '#a6cee3','#fb9a99','#fdbf6f','#cab2d6','#ff7f00','#b2df8a',
  '#e31a1c','#33a02c','#1f78b4','#6a3d9a','#b15928','#ffff99',
  '#f0027f','#bf5b17','#666666','#7fc97f','#beaed4','#fdc086',
  '#386cb0','#f0f9e8','#d95f02','#7570b3','#e7298a','#66a61e',
  '#e6ab02',
];

interface ProvinceData {
  count: number;
  species: string[];
}

interface ProvinceMapProps {
  family: string;
  /** Called when user clicks a province — passes species names in that province, or null to clear */
  onFilterSpecies?: (speciesNames: Set<string> | null) => void;
  /** Set of species names that have images (for dropdown count) */
  speciesWithImages?: Set<string> | null;
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

export function ProvinceMap({ family, onFilterSpecies, speciesWithImages }: ProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<ProvinceResponse | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom/pan state (button-only zoom, no scroll)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 450 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const BASE_WIDTH = 900;
  const BASE_HEIGHT = 450;
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

  // Build sorted list of provinces that have species (count > 0)
  const provincesWithData = useMemo(() => {
    if (!provinceData) return [];
    return Object.entries(provinceData.provinces)
      .filter(([, d]) => d.count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [provinceData]);

  // Assign categorical colors to provinces with data
  const provinceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    provincesWithData.forEach(([name], i) => {
      map.set(name, PROVINCE_COLORS[i % PROVINCE_COLORS.length]);
    });
    return map;
  }, [provincesWithData]);

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

  // Compute dropdown counts: species with images if available, else total
  const getDropdownCount = (provinceName: string): number => {
    const data = provinceData.provinces[provinceName];
    if (!data) return 0;
    if (speciesWithImages) {
      return data.species.filter((sp) => speciesWithImages.has(sp)).length;
    }
    return data.count;
  };

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
            const count = getDropdownCount(name);
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

          {/* Land masses (GSHHS coastline) — rendered BEFORE provinces */}
          {landData?.features.map((feature, i) => (
            <path
              key={`land-${i}`}
              d={pathGenerator(feature.geometry as GeoJSON.Geometry) || ""}
              fill="#888888"
              stroke="rgba(120,120,120,0.5)"
              strokeWidth={0.3}
              pointerEvents="none"
            />
          ))}

          {/* Province polygons — ON TOP of land */}
          {geoData.features.map((feature, i) => {
            const provinceName = feature.properties.PROVINCE;
            const data = provinceData.provinces[provinceName];
            const count = data?.count ?? 0;
            const isSelected = selectedProvince === provinceName;
            const isHovered = hoveredProvince === provinceName;

            const fill = count > 0 ? (provinceColorMap.get(provinceName) ?? "none") : "none";

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
                      ? "rgba(255,255,255,1)"
                      : count > 0
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.15)"
                }
                strokeWidth={isSelected ? 2 : isHovered ? 1.5 : count > 0 ? 1 : 0.3}
                style={{ cursor: count > 0 ? "pointer" : "grab" }}
                pointerEvents="all"
                onClick={(e) => {
                  if (isPanning) return;
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

        {/* Zoom controls (button only, no scroll zoom) */}
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
