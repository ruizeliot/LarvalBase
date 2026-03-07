"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoIdentity } from "d3-geo";

const CATEGORICAL_PALETTE = [
  '#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462',
  '#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f',
];

interface ProvinceData {
  count: number;
  species: string[];
}

interface ProvinceMapProps {
  family: string;
  onFilterSpecies?: (speciesNames: Set<string> | null) => void;
  speciesWithImages?: Set<string> | null;
  onSelectedProvincesChange?: (provinces: Set<string> | null) => void;
  externalSelectedProvinces?: Set<string> | null;
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
const BG_COLOR = "#000000";

function normalizeProvince(name: string): string {
  return name.replace(/[-/,.·\u00a0]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
}

/** Apply transform to <g> element directly -- no React re-render */
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

/**
 * Extract all coordinate pairs from a GeoJSON geometry, rounded to 1 decimal.
 * Used to build adjacency graph between provinces.
 */
function extractCoordKeys(geometry: GeoJSON.Geometry): Set<string> {
  const keys = new Set<string>();
  function walk(coords: unknown) {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      keys.add(`${Math.round(coords[0] * 10)},${Math.round(coords[1] * 10)}`);
      return;
    }
    for (const c of coords) walk(c);
  }
  if ('coordinates' in geometry) walk((geometry as { coordinates: unknown }).coordinates);
  if (geometry.type === 'GeometryCollection' && 'geometries' in geometry) {
    for (const g of (geometry as GeoJSON.GeometryCollection).geometries) {
      const sub = extractCoordKeys(g);
      sub.forEach(k => keys.add(k));
    }
  }
  return keys;
}

/**
 * Build adjacency graph from GeoJSON features by checking shared boundary coordinates.
 * Returns Map: province name -> Set of neighbor province names.
 */
function buildAdjacencyGraph(features: GeoFeature[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  // coordIndex: coordinate key -> list of province names that use it
  const coordIndex = new Map<string, string[]>();

  for (const f of features) {
    const name = f.properties?.PROVINCE;
    if (!name || !f.geometry) continue;
    if (!adj.has(name)) adj.set(name, new Set());

    const keys = extractCoordKeys(f.geometry);
    for (const k of keys) {
      const existing = coordIndex.get(k);
      if (existing) {
        for (const neighbor of existing) {
          if (neighbor !== name) {
            adj.get(name)!.add(neighbor);
            adj.get(neighbor)!.add(name);
          }
        }
        existing.push(name);
      } else {
        coordIndex.set(k, [name]);
      }
    }
  }

  return adj;
}

/**
 * Greedy graph-coloring: assign each province the first color from palette
 * not used by any neighbor.
 */
function graphColorProvinces(
  provinceNames: string[],
  adjacency: Map<string, Set<string>>,
  palette: string[]
): Map<string, string> {
  const colorMap = new Map<string, string>();
  for (const name of provinceNames) {
    const neighbors = adjacency.get(name) ?? new Set();
    const usedColors = new Set<string>();
    for (const n of neighbors) {
      const c = colorMap.get(n);
      if (c) usedColors.add(c);
    }
    // Pick first unused color
    let assigned = palette[0];
    for (const c of palette) {
      if (!usedColors.has(c)) {
        assigned = c;
        break;
      }
    }
    colorMap.set(name, assigned);
  }
  return colorMap;
}

export function ProvinceMap({ family, onFilterSpecies, speciesWithImages, onSelectedProvincesChange, externalSelectedProvinces }: ProvinceMapProps) {
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
    onSelectedProvincesChange?.(null);
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

  // Count species with images per province
  const getImageCount = useCallback((info: ProvinceData | null): number => {
    if (!info || !speciesWithImages) return 0;
    return info.species.filter(s => speciesWithImages.has(s)).length;
  }, [speciesWithImages]);

  // Has images? Used for determining if province is "present" (colored)
  const provinceHasImages = useCallback((featureName: string): boolean => {
    if (!speciesWithImages) {
      // If no image info available, fall back to species count
      const info = getProvinceInfo(featureName);
      return info !== null && info.count > 0;
    }
    const info = getProvinceInfo(featureName);
    if (!info) return false;
    return info.species.some(s => speciesWithImages.has(s));
  }, [getProvinceInfo, speciesWithImages]);

  const sortedProvinces = useMemo(() => {
    if (!provinceData) return [];
    return Object.entries(provinceData.provinces)
      .filter(([, data]) => data.count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [provinceData]);

  // Build adjacency graph and apply graph-coloring
  const adjacencyGraph = useMemo(() => {
    if (!geoData) return new Map<string, Set<string>>();
    return buildAdjacencyGraph(geoData.features);
  }, [geoData]);

  const provinceColorMap = useMemo(() => {
    // Get all province names that have species with images
    const presentProvinces = sortedProvinces
      .filter(([name]) => provinceHasImages(name))
      .map(([name]) => name);

    // Also include all GeoJSON province names for adjacency context
    const allGeoNames = geoData
      ? [...new Set(geoData.features.map(f => f.properties?.PROVINCE).filter(Boolean))]
      : [];

    // Graph-color ALL provinces (for proper neighbor differentiation),
    // but we only display colors for present ones
    const allNames = [...new Set([...allGeoNames, ...presentProvinces])];
    return graphColorProvinces(allNames, adjacencyGraph, CATEGORICAL_PALETTE);
  }, [sortedProvinces, adjacencyGraph, geoData, provinceHasImages]);

  // Sync external province selection (from sidebar checkboxes)
  useEffect(() => {
    if (externalSelectedProvinces === undefined) return;
    if (externalSelectedProvinces === null) {
      if (selectedProvince !== null) {
        setSelectedProvince(null);
        onFilterSpecies?.(null);
      }
    } else if (externalSelectedProvinces.size === 1) {
      const name = [...externalSelectedProvinces][0];
      setSelectedProvince(name);
      const info = getProvinceInfo(name);
      if (info) onFilterSpecies?.(new Set(info.species));
    } else if (externalSelectedProvinces.size > 1) {
      // Multi-select: merge species from all selected provinces
      setSelectedProvince(null); // can't highlight one on map
      const allSpecies = new Set<string>();
      for (const name of externalSelectedProvinces) {
        const info = getProvinceInfo(name);
        if (info) info.species.forEach(s => allSpecies.add(s));
      }
      onFilterSpecies?.(allSpecies.size > 0 ? allSpecies : null);
    }
  }, [externalSelectedProvinces]);

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
        onSelectedProvincesChange?.(null);
      } else {
        setSelectedProvince(provinceName);
        onFilterSpecies?.(new Set(info.species));
        onSelectedProvincesChange?.(new Set([provinceName]));
      }
    },
    [selectedProvince, getProvinceInfo, onFilterSpecies, onSelectedProvincesChange]
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
      <div className="w-full aspect-[2/1] bg-black rounded-lg animate-pulse" />
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
              onSelectedProvincesChange?.(new Set([val]));
            } else {
              onFilterSpecies?.(null);
              onSelectedProvincesChange?.(null);
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
            onClick={() => { setSelectedProvince(null); onFilterSpecies?.(null); onSelectedProvincesChange?.(null); }}
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
          style={{ cursor: isPanning ? "grabbing" : "grab", background: BG_COLOR }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <g ref={gRef} transform="translate(0,0) scale(1)">
            {/* Province polygons (below land) */}
            {provincePaths.map(({ name: provinceName, d }, i) => {
              const hasImages = provinceHasImages(provinceName);
              const isHovered = hoveredProvince === provinceName;
              const isSelected = selectedProvince === provinceName ||
                (externalSelectedProvinces?.has(provinceName) ?? false);

              const fill = hasImages ? (provinceColorMap.get(provinceName) ?? BG_COLOR) : BG_COLOR;

              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  fillOpacity={hasImages ? (isSelected ? 0.9 : 0.75) : 1}
                  stroke={
                    isSelected
                      ? "rgba(255,255,0,1)"
                      : isHovered
                        ? "rgba(255,255,255,1)"
                        : hasImages
                          ? "rgba(255,255,255,0.8)"
                          : "none"
                  }
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : hasImages ? 1 : 0}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="all"
                  style={{ cursor: hasImages ? "pointer" : "default" }}
                  onClick={() => handleProvinceClick(provinceName)}
                  onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                  onMouseLeave={() => { setHoveredProvince(null); setTooltipPos(null); }}
                />
              );
            })}

            {/* Land masses ON TOP -- white continents overlaying provinces */}
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
              if (!info || info.count === 0) {
                return <div className="text-white/50">No species</div>;
              }
              const imgCount = getImageCount(info);
              return (
                <div className="text-white/70">
                  {info.count} species{speciesWithImages ? `, ${imgCount} with images` : ''}
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
            &#x21BA;
          </button>
        </div>
      </div>
    </div>
  );
}
