"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoIdentity } from "d3-geo";

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

interface ProvinceApiResponse {
  family: string;
  provinces: Record<string, ProvinceData>;
  totalSpecies: number;
}

const BASE_WIDTH = 900;
const BASE_HEIGHT = 450;
const MAX_ZOOM = 6;

/** Normalize province name for matching */
function normalizeProvince(name: string): string {
  return name.replace(/[-/,.·\u00a0]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
}

export function ProvinceMap({ family, onFilterSpecies, speciesWithImages }: ProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<ProvinceApiResponse | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom/pan state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: BASE_WIDTH, h: BASE_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // Load pre-projected Robinson GeoJSON
  useEffect(() => {
    fetch("/data/robinson_provinces.geojson", { cache: "force-cache" })
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);

    fetch("/data/robinson_coastline.geojson", { cache: "force-cache" })
      .then((r) => r.json())
      .then(setLandData)
      .catch(console.error);
  }, []);

  // Fetch family province data
  useEffect(() => {
    setSelectedProvince(null);
    onFilterSpecies?.(null);
    setViewBox({ x: 0, y: 0, w: BASE_WIDTH, h: BASE_HEIGHT });

    fetch(`/api/families/${encodeURIComponent(family)}/provinces`)
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(console.error);
  }, [family]);

  // Use geoIdentity with fitSize for pre-projected data
  const projection = useMemo(() => {
    if (!geoData) return null;
    return geoIdentity()
      .reflectY(true)
      .fitSize([BASE_WIDTH, BASE_HEIGHT], geoData as unknown as GeoJSON.FeatureCollection);
  }, [geoData]);

  const pathGenerator = useMemo(
    () => projection ? geoPath().projection(projection) : null,
    [projection]
  );

  // Build province name matching map (normalized shapefile name -> canonical name)
  const provinceNormMap = useMemo(() => {
    if (!provinceData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const pName of Object.keys(provinceData.provinces)) {
      map.set(normalizeProvince(pName), pName);
    }
    return map;
  }, [provinceData]);

  // Province data lookup by feature name
  const getProvinceInfo = useCallback((featureName: string): ProvinceData | null => {
    if (!provinceData) return null;
    // Direct match first
    if (provinceData.provinces[featureName]) return provinceData.provinces[featureName];
    // Normalized match
    const canonical = provinceNormMap.get(normalizeProvince(featureName));
    if (canonical) return provinceData.provinces[canonical] ?? null;
    return null;
  }, [provinceData, provinceNormMap]);

  // Sorted list of provinces with species (for dropdown)
  const sortedProvinces = useMemo(() => {
    if (!provinceData) return [];
    return Object.entries(provinceData.provinces)
      .filter(([, data]) => data.count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [provinceData]);

  // Assign categorical colors to present provinces
  const provinceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    sortedProvinces.forEach(([name], i) => {
      map.set(name, PROVINCE_COLORS[i % PROVINCE_COLORS.length]);
    });
    return map;
  }, [sortedProvinces]);

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

  const handleMouseMoveTooltip = useCallback(
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

  const handleProvinceClick = useCallback(
    (provinceName: string) => {
      const info = getProvinceInfo(provinceName);
      if (!info || info.count === 0) return;

      if (selectedProvince === provinceName) {
        setSelectedProvince(null);
        onFilterSpecies?.(null);
      } else {
        setSelectedProvince(provinceName);
        onFilterSpecies?.(new Set(info.species));
      }
    },
    [selectedProvince, getProvinceInfo, onFilterSpecies]
  );

  if (!geoData || !provinceData || !pathGenerator) {
    return (
      <div className="w-full aspect-[2/1] bg-[#1a1a2e] rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="space-y-3">
      {/* Dropdown selector */}
      <div className="flex gap-2 items-center">
        <select
          className="flex-1 bg-card border border-border rounded px-3 py-1.5 text-sm"
          value={selectedProvince || ""}
          onChange={(e) => {
            const val = e.target.value || null;
            setSelectedProvince(val);
            if (val) {
              const info = getProvinceInfo(val);
              if (info) onFilterSpecies?.(new Set(info.species));
            } else {
              onFilterSpecies?.(null);
            }
          }}
        >
          <option value="">All provinces ({sortedProvinces.reduce((sum, [, d]) => sum + d.count, 0)} species)</option>
          {sortedProvinces.map(([name, data]) => {
            const withImagesCount = speciesWithImages
              ? data.species.filter(s => speciesWithImages.has(s)).length
              : null;
            return (
              <option key={name} value={name}>
                {name} ({data.count} species{withImagesCount !== null ? `, ${withImagesCount} with images` : ''})
              </option>
            );
          })}
        </select>
        {selectedProvince && (
          <button
            className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
            onClick={() => { setSelectedProvince(null); onFilterSpecies?.(null); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Map */}
      <div
        className="relative overflow-hidden rounded-lg border border-border/50"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredProvince(null); setTooltipPos(null); }}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full"
          style={{ cursor: isPanning ? "grabbing" : "grab", background: "#1a1a2e" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMovePan}
        >
          {/* Land masses */}
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

          {/* Province polygons ON TOP of land */}
          {geoData.features.map((feature, i) => {
            const provinceName = feature.properties.PROVINCE;
            const info = getProvinceInfo(provinceName);
            const isPresent = info !== null && info.count > 0;
            const isHovered = hoveredProvince === provinceName;
            const isSelected = selectedProvince === provinceName;

            const canonicalName = isPresent
              ? (provinceNormMap.get(normalizeProvince(provinceName)) ?? provinceName)
              : provinceName;
            const fill = isPresent ? (provinceColorMap.get(canonicalName) ?? "none") : "none";

            return (
              <path
                key={i}
                d={pathGenerator(feature.geometry as GeoJSON.Geometry) || ""}
                fill={fill}
                fillOpacity={isPresent ? (isSelected ? 0.9 : 0.75) : 0}
                stroke={
                  isSelected
                    ? "rgba(255,255,0,1)"
                    : isHovered
                      ? "rgba(255,255,255,1)"
                      : isPresent
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.1)"
                }
                strokeWidth={isSelected ? 2 : isHovered ? 1.5 : isPresent ? 1 : 0.2}
                pointerEvents="all"
                style={{ cursor: isPresent ? "pointer" : "default" }}
                onClick={() => handleProvinceClick(provinceName)}
                onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                onMouseLeave={() => { setHoveredProvince(null); setTooltipPos(null); }}
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
              top: tooltipPos.y - 25,
              transform: tooltipPos.x > 400 ? "translateX(-110%)" : undefined,
            }}
          >
            <div className="font-medium">{hoveredProvince}</div>
            {(() => {
              const info = getProvinceInfo(hoveredProvince);
              return info && info.count > 0
                ? <div className="text-white/70">{info.count} species</div>
                : <div className="text-white/50">No species</div>;
            })()}
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
    </div>
  );
}
