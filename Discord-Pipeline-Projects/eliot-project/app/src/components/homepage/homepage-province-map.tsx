"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoIdentity } from "d3-geo";

/**
 * YlOrRd color ramp (yellow → orange → red).
 */
const YLOR_RD_COLORS = [
  [255, 255, 204],  // light yellow
  [255, 237, 160],
  [254, 217, 118],
  [254, 178, 76],   // orange
  [253, 141, 60],
  [252, 78, 42],
  [227, 26, 28],    // red
  [177, 0, 38],     // dark red
];

/**
 * YlGn color ramp (yellow → green).
 */
const YL_GN_COLORS = [
  [255, 255, 229],  // light yellow
  [247, 252, 185],
  [217, 240, 163],
  [173, 221, 142],
  [120, 198, 121],  // green
  [65, 171, 93],
  [35, 132, 67],
  [0, 90, 50],      // dark green
];

/**
 * Percentage color interpolation with configurable palette.
 */
function getPercentageColor(pct: number, palette: number[][] = YLOR_RD_COLORS): string {
  if (pct <= 0) return "transparent";
  // Clamp 0-100
  const t = Math.min(100, Math.max(0, pct)) / 100;
  const colors = palette;
  const idx = t * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  const f = idx - lo;
  const r = Math.round(colors[lo][0] * (1 - f) + colors[hi][0] * f);
  const g = Math.round(colors[lo][1] * (1 - f) + colors[hi][1] * f);
  const b = Math.round(colors[lo][2] * (1 - f) + colors[hi][2] * f);
  return `rgb(${r},${g},${b})`;
}

interface ProvinceApiData {
  larvalbaseCount: number;
  totalCount: number;
  percentage: number;
  species: string[];
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

const TRAIT_OPTIONS = [
  { value: "all", label: "All dispersal traits" },
  { value: "has_images", label: "Colored pictures" },
  { value: "egg_position", label: "Egg traits" },
  { value: "hatching_size", label: "Hatching/parturition size" },
  { value: "incubation_duration", label: "Incubation/gestation" },
  { value: "first_feeding_age", label: "First feeding age" },
  { value: "first_feeding_size", label: "First feeding size" },
  { value: "flexion_age", label: "Flexion age" },
  { value: "flexion_size", label: "Flexion size" },
  { value: "metamorphosis_age", label: "Metamorphosis age" },
  { value: "metamorphosis_size", label: "Metamorphosis size" },
  { value: "larval_age_at_length", label: "Age-at-length data" },
  { value: "settlement_age", label: "Settlement age" },
  { value: "settlement_size", label: "Settlement size" },
  { value: "critical_swimming_speed", label: "Critical swimming" },
  { value: "in_situ_swimming_speed", label: "In situ swimming" },
  { value: "vertical_distribution", label: "Vertical position" },
  { value: "pelagic_juvenile_behavior", label: "Pelagic juvenile" },
  { value: "rafting_behavior", label: "Rafting" },
];

const BASE_WIDTH = 900;
const BASE_HEIGHT = 450;
const MAX_ZOOM = 6;
const VIEWBOX = `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`;
const BG_COLOR = "#0D0D0D";

function normalizeProvince(name: string): string {
  return name.replace(/[-/,.·\u00a0]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
}

function applyTransform(
  gEl: SVGGElement | null,
  t: { x: number; y: number; scale: number }
) {
  if (!gEl) return;
  if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.scale) || t.scale <= 0) {
    t.x = 0; t.y = 0; t.scale = 1;
  }
  gEl.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.scale})`);
}

interface HomepageProvinceMapProps {
  onFilterSpecies?: (species: Set<string> | null) => void;
  /** When 'families', show percentage of families per province instead of species */
  mode?: 'species' | 'families';
}

export function HomepageProvinceMap({ onFilterSpecies, mode = 'species' }: HomepageProvinceMapProps) {
  const colorPalette = mode === 'families' ? YL_GN_COLORS : YLOR_RD_COLORS;
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<Record<string, ProvinceApiData> | null>(null);
  const [selectedTrait, setSelectedTrait] = useState("all");
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);

  // Load GeoJSON data
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

  // Load province percentage data
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (selectedTrait !== "all") params.set('trait', selectedTrait);
    if (mode === 'families') params.set('mode', 'families');
    const qs = params.toString();
    const url = `/api/homepage-stats/province-map${qs ? `?${qs}` : ''}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setProvinceData(data.provinces ?? {});
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Province map load error:", err);
        setIsLoading(false);
      });
  }, [selectedTrait, mode]);

  // Reset selection when trait changes
  useEffect(() => {
    setSelectedProvince(null);
    onFilterSpecies?.(null);
    transformRef.current = { x: 0, y: 0, scale: 1 };
    applyTransform(gRef.current, transformRef.current);
  }, [selectedTrait]);

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

  const provincePaths = useMemo(() => {
    if (!pathGenerator || !geoData) return [];
    return geoData.features.map((feature) => {
      const name = feature.properties?.PROVINCE;
      if (!name || !feature.geometry) return null;
      try {
        const d = pathGenerator(feature.geometry as GeoJSON.Geometry) || "";
        return d ? { name, d } : null;
      } catch { return null; }
    }).filter(Boolean) as { name: string; d: string }[];
  }, [pathGenerator, geoData]);

  const landPaths = useMemo(() => {
    if (!pathGenerator || !landData) return [];
    return landData.features.map((feature) => {
      if (!feature.geometry) return null;
      try {
        const d = pathGenerator(feature.geometry as GeoJSON.Geometry) || "";
        return d || null;
      } catch { return null; }
    }).filter(Boolean) as string[];
  }, [pathGenerator, landData]);

  // Province matching
  const provinceNormMap = useMemo(() => {
    if (!provinceData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const pName of Object.keys(provinceData)) {
      map.set(normalizeProvince(pName), pName);
    }
    return map;
  }, [provinceData]);

  const getProvinceInfo = useCallback((featureName: string): ProvinceApiData | null => {
    if (!provinceData) return null;
    if (provinceData[featureName]) return provinceData[featureName];
    const canonical = provinceNormMap.get(normalizeProvince(featureName));
    if (canonical) return provinceData[canonical] ?? null;
    return null;
  }, [provinceData, provinceNormMap]);

  // Zoom/Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      cx: e.clientX,
      cy: e.clientY,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !panStartRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgScale = BASE_WIDTH / rect.width;
    const dx = (e.clientX - panStartRef.current.cx) * svgScale;
    const dy = (e.clientY - panStartRef.current.cy) * svgScale;
    transformRef.current.x = panStartRef.current.tx + dx;
    transformRef.current.y = panStartRef.current.ty + dy;
    applyTransform(gRef.current, transformRef.current);
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleMouseMoveTooltip = useCallback(
    (e: React.MouseEvent, provinceName: string) => {
      if (isPanningRef.current) return;
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

  const handleProvinceClick = useCallback(
    (provinceName: string) => {
      const info = getProvinceInfo(provinceName);
      if (!info || info.species.length === 0) return;

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

  const zoomBy = useCallback((factor: number) => {
    const t = transformRef.current;
    const newScale = Math.min(MAX_ZOOM, Math.max(1, t.scale * factor));
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;
    t.x = cx - ((cx - t.x) / t.scale) * newScale;
    t.y = cy - ((cy - t.y) / t.scale) * newScale;
    t.scale = newScale;
    applyTransform(gRef.current, t);
  }, []);

  const resetZoom = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    applyTransform(gRef.current, transformRef.current);
  }, []);

  // Max percentage for legend scaling
  const maxPercentage = useMemo(() => {
    if (!provinceData) return 100;
    let max = 0;
    for (const data of Object.values(provinceData)) {
      if (data.percentage > max) max = data.percentage;
    }
    return Math.max(max, 1);
  }, [provinceData]);

  if (!geoData || !pathGenerator) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {mode === 'families'
          ? 'Percentage of families per region in the database (click to filter)'
          : 'Percentage of species per region in the database (click to filter species)'}
        </h3>
        <div className="w-full aspect-[2/1] bg-[#0D0D0D] rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {mode === 'families'
          ? 'Percentage of families per region in the database (click to filter)'
          : 'Percentage of species per region in the database (click to filter species)'}
      </h3>

      {/* Trait dropdown */}
      <div className="flex gap-2 items-center">
        <select
          className="flex-1 bg-card border border-border rounded px-3 py-1.5 text-sm"
          value={selectedTrait}
          onChange={(e) => setSelectedTrait(e.target.value)}
        >
          {TRAIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {selectedProvince && (
          <button
            className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
            onClick={() => { setSelectedProvince(null); onFilterSpecies?.(null); }}
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Map */}
      <div
        className="relative overflow-hidden rounded-lg border border-border/50"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredProvince(null); setTooltipPos(null); }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
            <div className="text-sm text-white/70">Loading...</div>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={VIEWBOX}
          className="w-full"
          style={{ cursor: isPanning ? "grabbing" : "grab", background: BG_COLOR }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <g ref={gRef} transform="translate(0,0) scale(1)">
            {/* Province polygons (below land) */}
            {provincePaths.map(({ name: provinceName, d }, i) => {
              const info = getProvinceInfo(provinceName);
              const hasData = info && info.species.length > 0;
              const isHovered = hoveredProvince === provinceName;
              const isSelected = selectedProvince === provinceName;
              const pct = info?.percentage ?? 0;

              // Normalize percentage to maxPercentage so colors use full scale range
              const normalizedPct = maxPercentage > 0 ? (pct / maxPercentage) * 100 : 0;
              const fill = hasData ? getPercentageColor(normalizedPct, colorPalette) : "transparent";

              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  fillOpacity={hasData ? (isSelected ? 0.95 : 0.85) : 0}
                  stroke={
                    isSelected
                      ? "rgba(255,255,0,1)"
                      : isHovered
                        ? "rgba(255,255,255,1)"
                        : hasData
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(255,255,255,0.08)"
                  }
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : hasData ? 0.8 : 0.2}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="all"
                  style={{ cursor: hasData ? "pointer" : "default" }}
                  onClick={() => handleProvinceClick(provinceName)}
                  onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                  onMouseLeave={() => { setHoveredProvince(null); setTooltipPos(null); }}
                />
              );
            })}

            {/* Land masses ON TOP -- white continents */}
            {landPaths.map((d, i) => (
              <path
                key={`land-${i}`}
                d={d}
                fill="#ffffff"
                stroke="rgba(200,200,200,0.5)"
                strokeWidth={0.3}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ))}
          </g>
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
              if (!info || info.species.length === 0) {
                return <div className="text-white/50">{mode === 'families' ? 'No families in database' : 'No species in database'}</div>;
              }
              const unitLabel = mode === 'families' ? 'families' : 'species';
              return (
                <div className="text-white/70">
                  {info.percentage.toFixed(1)}% ({info.larvalbaseCount}/{info.totalCount} {unitLabel})
                </div>
              );
            })()}
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-sm flex items-center justify-center"
            onClick={() => zoomBy(1.33)}
          >+</button>
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-sm flex items-center justify-center"
            onClick={() => zoomBy(0.75)}
          >−</button>
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-[9px] flex items-center justify-center"
            title="Reset zoom"
            onClick={resetZoom}
          >&#x21BA;</button>
        </div>

        {/* Color legend */}
        <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 flex items-center gap-1.5">
          <span className="text-[9px] text-white/60">0%</span>
          <div className="w-24 h-2.5 rounded-sm" style={{
            background: `linear-gradient(to right, ${getPercentageColor(1, colorPalette)}, ${getPercentageColor(25, colorPalette)}, ${getPercentageColor(50, colorPalette)}, ${getPercentageColor(75, colorPalette)}, ${getPercentageColor(100, colorPalette)})`
          }} />
          <span className="text-[9px] text-white/60">{maxPercentage.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
