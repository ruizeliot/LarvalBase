"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoIdentity } from "d3-geo";

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
  onFilterSpecies?: (speciesNames: Set<string> | null) => void;
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
const VIEWBOX = `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`;

function normalizeProvince(name: string): string {
  return name.replace(/[-/,.·\u00a0]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
}

/** Apply transform to <g> element directly — no React re-render */
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

export function ProvinceMap({ family, onFilterSpecies, speciesWithImages }: ProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<ProvinceApiResponse | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);

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

  // Reset on family change
  useEffect(() => {
    setSelectedProvince(null);
    onFilterSpecies?.(null);
    transformRef.current = { x: 0, y: 0, scale: 1 };
    applyTransform(gRef.current, transformRef.current);

    fetch(`/api/families/${encodeURIComponent(family)}/provinces`)
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(console.error);
  }, [family]);

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

  // Pre-compute all path strings (only recompute when geo data changes, NOT on zoom/pan)
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
    for (const pName of Object.keys(provinceData.provinces)) {
      map.set(normalizeProvince(pName), pName);
    }
    return map;
  }, [provinceData]);

  const getProvinceInfo = useCallback((featureName: string): ProvinceData | null => {
    if (!provinceData) return null;
    if (provinceData.provinces[featureName]) return provinceData.provinces[featureName];
    const canonical = provinceNormMap.get(normalizeProvince(featureName));
    if (canonical) return provinceData.provinces[canonical] ?? null;
    return null;
  }, [provinceData, provinceNormMap]);

  const sortedProvinces = useMemo(() => {
    if (!provinceData) return [];
    return Object.entries(provinceData.provinces)
      .filter(([, data]) => data.count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [provinceData]);

  const provinceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    sortedProvinces.forEach(([name], i) => {
      map.set(name, PROVINCE_COLORS[i % PROVINCE_COLORS.length]);
    });
    return map;
  }, [sortedProvinces]);

  // --- Zoom/Pan handlers (ref-based, no React re-renders during interaction) ---

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
          <option value="">All provinces ({sortedProvinces.reduce((sum, [, d]) => sum + d.count, 0)} species{speciesWithImages ? `, ${speciesWithImages.size} with images` : ''})</option>
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
          viewBox={VIEWBOX}
          className="w-full"
          style={{ cursor: isPanning ? "grabbing" : "grab", background: "#1a1a2e" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <g ref={gRef} transform="translate(0,0) scale(1)">
            {/* Province polygons (below land) */}
            {provincePaths.map(({ name: provinceName, d }, i) => {
              const info = getProvinceInfo(provinceName);
              const isPresent = info !== null && info.count > 0;
              const isHovered = hoveredProvince === provinceName;
              const isSelected = selectedProvince === provinceName;

              const canonicalName = isPresent
                ? (provinceNormMap.get(normalizeProvince(provinceName)) ?? provinceName)
                : provinceName;
              const fill = isPresent ? (provinceColorMap.get(canonicalName) ?? "#1a1a2e") : "#1a1a2e";

              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  fillOpacity={isPresent ? (isSelected ? 0.9 : 0.75) : 1}
                  stroke={
                    isSelected
                      ? "rgba(255,255,0,1)"
                      : isHovered
                        ? "rgba(255,255,255,1)"
                        : isPresent
                          ? "rgba(255,255,255,0.8)"
                          : "none"
                  }
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : isPresent ? 1 : 0}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="all"
                  style={{ cursor: isPresent ? "pointer" : "default" }}
                  onClick={() => handleProvinceClick(provinceName)}
                  onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                  onMouseLeave={() => { setHoveredProvince(null); setTooltipPos(null); }}
                />
              );
            })}

            {/* Land masses ON TOP — white continents overlaying provinces */}
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
            onClick={() => zoomBy(1.33)}
          >
            +
          </button>
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-sm flex items-center justify-center"
            onClick={() => zoomBy(0.75)}
          >
            −
          </button>
          <button
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-[9px] flex items-center justify-center"
            title="Reset zoom"
            onClick={resetZoom}
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  );
}
