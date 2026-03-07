"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoIdentity } from "d3-geo";

/**
 * Convert HSL to hex color string.
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate unique province colors using golden ratio hue distribution.
 * Produces muted, harmonious colors with varied saturation/lightness.
 */
function generateProvinceColors(count: number): string[] {
  const GOLDEN_RATIO = 0.618033988749895;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = ((i * GOLDEN_RATIO) % 1.0) * 360;
    const group = i % 3;
    const sat = group === 0 ? 42 : group === 1 ? 55 : 32;
    const lit = group === 0 ? 52 : group === 1 ? 42 : 62;
    colors.push(hslToHex(hue, sat, lit));
  }
  return colors;
}

const PROVINCE_COLORS = generateProvinceColors(60);

function normalizeProvince(name: string): string {
  return name.replace(/[-/,.·\u00a0]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
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

interface SpeciesProvinceResponse {
  speciesName: string;
  provinces: string[];
  source: string;
}

interface SpeciesProvinceMapProps {
  speciesId: string;
}

const BASE_WIDTH = 900;
const BASE_HEIGHT = 450;
const MAX_ZOOM = 6;
const VIEWBOX = `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`;

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

/**
 * Extract coordinate keys from GeoJSON geometry for adjacency detection.
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

function buildAdjacencyGraph(features: GeoFeature[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
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
    let assigned = palette[0];
    for (const c of palette) {
      if (!usedColors.has(c)) { assigned = c; break; }
    }
    colorMap.set(name, assigned);
  }
  return colorMap;
}

export function SpeciesProvinceMap({ speciesId }: SpeciesProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<SpeciesProvinceResponse | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);
  const autoZoomAppliedRef = useRef(false);

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

  useEffect(() => {
    autoZoomAppliedRef.current = false;
    transformRef.current = { x: 0, y: 0, scale: 1 };
    applyTransform(gRef.current, transformRef.current);

    fetch(`/api/species/${encodeURIComponent(speciesId)}/provinces`)
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(console.error);
  }, [speciesId]);

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

  // Pre-compute all path strings (only when geo data changes)
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

  const presentProvinces = useMemo(() => {
    if (!provinceData) return new Set<string>();
    return new Set(provinceData.provinces);
  }, [provinceData]);

  const isProvincePresent = useCallback((featureName: string): boolean => {
    if (presentProvinces.has(featureName)) return true;
    const norm = normalizeProvince(featureName);
    for (const p of presentProvinces) {
      if (normalizeProvince(p) === norm) return true;
    }
    return false;
  }, [presentProvinces]);

  const adjacencyGraph = useMemo(() => {
    if (!geoData) return new Map<string, Set<string>>();
    return buildAdjacencyGraph(geoData.features);
  }, [geoData]);

  const provinceColorMap = useMemo(() => {
    if (!geoData) return new Map<string, string>();
    const allGeoNames = [...new Set(geoData.features.map(f => f.properties?.PROVINCE).filter(Boolean))] as string[];
    return graphColorProvinces(allGeoNames, adjacencyGraph, PROVINCE_COLORS);
  }, [geoData, adjacencyGraph]);

  function getColor(featureName: string): string {
    return provinceColorMap.get(featureName) ?? "none";
  }

  // Auto-zoom to species region (uses ref-based transform)
  useEffect(() => {
    if (!geoData || !provinceData || !pathGenerator || presentProvinces.size === 0 || autoZoomAppliedRef.current) return;

    const presentFeatures = geoData.features.filter(f => f.properties?.PROVINCE && isProvincePresent(f.properties.PROVINCE));
    if (presentFeatures.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const feature of presentFeatures) {
      if (!feature.geometry) continue;
      try {
        const bounds = pathGenerator.bounds(feature.geometry as GeoJSON.Geometry);
        if (!Number.isFinite(bounds[0][0]) || !Number.isFinite(bounds[0][1]) || !Number.isFinite(bounds[1][0]) || !Number.isFinite(bounds[1][1])) continue;
        if (bounds[0][0] < minX) minX = bounds[0][0];
        if (bounds[0][1] < minY) minY = bounds[0][1];
        if (bounds[1][0] > maxX) maxX = bounds[1][0];
        if (bounds[1][1] > maxY) maxY = bounds[1][1];
      } catch { continue; }
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

    const bw = maxX - minX;
    const bh = maxY - minY;
    const pad = 0.2;
    const vx = minX - bw * pad;
    const vy = minY - bh * pad;
    const vw = bw * (1 + 2 * pad);
    const vh = bh * (1 + 2 * pad);

    const aspect = BASE_WIDTH / BASE_HEIGHT;
    let finalW = vw;
    let finalH = vh;
    if (vw / vh > aspect) {
      finalH = vw / aspect;
    } else {
      finalW = vh * aspect;
    }

    const minW = BASE_WIDTH / MAX_ZOOM;
    if (finalW < minW) { finalW = minW; finalH = finalW / aspect; }
    if (finalW > BASE_WIDTH) { finalW = BASE_WIDTH; finalH = BASE_HEIGHT; }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Convert viewBox region to transform: scale = BASE_WIDTH / w, tx = -vx * scale, ty = -vy * scale
    const scale = BASE_WIDTH / finalW;
    const tx = -(cx - finalW / 2) * scale;
    const ty = -(cy - finalH / 2) * scale;

    transformRef.current = { x: tx, y: ty, scale };
    applyTransform(gRef.current, transformRef.current);
    autoZoomAppliedRef.current = true;
  }, [geoData, provinceData, presentProvinces, pathGenerator, isProvincePresent]);

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
      <div className="w-full aspect-[2/1] bg-[#0D0D0D] rounded-lg animate-pulse" />
    );
  }

  const cleanSource = (() => {
    const raw = provinceData.source || "";
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const unique = [...new Set(parts)];
    return unique.join(", ");
  })();

  return (
    <div className="space-y-1">
      <div
        className="relative overflow-hidden rounded-lg border border-border/50"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredProvince(null); setTooltipPos(null); }}
      >
        <svg
          ref={svgRef}
          viewBox={VIEWBOX}
          className="w-full"
          style={{ cursor: isPanning ? "grabbing" : "grab", background: "#0D0D0D" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <g ref={gRef} transform="translate(0,0) scale(1)">
            {/* Province polygons (below land) */}
            {provincePaths.map(({ name: provinceName, d }, i) => {
              const isPresent = isProvincePresent(provinceName);
              const isHovered = hoveredProvince === provinceName;
              const fill = isPresent ? getColor(provinceName) : "transparent";

              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  fillOpacity={isPresent ? 0.75 : 0}
                  stroke={
                    isHovered
                      ? "rgba(255,255,255,1)"
                      : isPresent
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.08)"
                  }
                  strokeWidth={isHovered ? 2 : isPresent ? 1.2 : 0.2}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="all"
                  onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                  onMouseLeave={() => { setHoveredProvince(null); setTooltipPos(null); }}
                />
              );
            })}

            {/* Land masses ON TOP — white continents */}
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
              transform: tooltipPos.x > 250 ? "translateX(-110%)" : undefined,
            }}
          >
            <div className="font-medium">{hoveredProvince}</div>
            <div className="text-white/70">
              {isProvincePresent(hoveredProvince) ? "Present" : "Absent"}
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            className="w-6 h-6 bg-white hover:bg-white/80 text-black rounded text-sm flex items-center justify-center"
            onClick={() => zoomBy(1.33)}
          >
            +
          </button>
          <button
            className="w-6 h-6 bg-white hover:bg-white/80 text-black rounded text-sm flex items-center justify-center"
            onClick={() => zoomBy(0.75)}
          >
            −
          </button>
          <button
            className="w-6 h-6 bg-white hover:bg-white/80 text-black rounded text-[9px] flex items-center justify-center"
            title="Reset zoom"
            onClick={resetZoom}
          >
            ↺
          </button>
        </div>
      </div>

      {/* Source line */}
      {cleanSource && (
        <div className="text-xs text-muted-foreground">
          Source: {cleanSource}
        </div>
      )}
    </div>
  );
}
