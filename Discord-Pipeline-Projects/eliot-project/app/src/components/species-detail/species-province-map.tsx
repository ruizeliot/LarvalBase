"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoIdentity } from "d3-geo";

/** Validate viewBox values — prevent NaN/Infinity from corrupting state */
function safeViewBox(vb: { x: number; y: number; w: number; h: number }, fallback: { x: number; y: number; w: number; h: number }) {
  if (!Number.isFinite(vb.x) || !Number.isFinite(vb.y) || !Number.isFinite(vb.w) || !Number.isFinite(vb.h) || vb.w <= 0 || vb.h <= 0) {
    return fallback;
  }
  return vb;
}

/** Error boundary to prevent map crashes from killing the page */
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("SpeciesProvinceMap error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full aspect-[2/1] bg-[#1a1a2e] rounded-lg flex items-center justify-center text-white/50 text-sm">
          Map could not be displayed
        </div>
      );
    }
    return this.props.children;
  }
}

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

/** Normalize province name for matching */
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

export function SpeciesProvinceMap(props: SpeciesProvinceMapProps) {
  return (
    <MapErrorBoundary>
      <SpeciesProvinceMapInner {...props} />
    </MapErrorBoundary>
  );
}

function SpeciesProvinceMapInner({ speciesId }: SpeciesProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<SpeciesProvinceResponse | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom/pan state (button-only, no scroll)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: BASE_WIDTH, h: BASE_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [autoZoomApplied, setAutoZoomApplied] = useState(false);

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
    setAutoZoomApplied(false);
    fetch(`/api/species/${encodeURIComponent(speciesId)}/provinces`)
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(console.error);
  }, [speciesId]);

  // Use geoIdentity with fitSize for pre-projected Robinson data
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

  // Build normalized name set for matching
  const presentProvinces = useMemo(() => {
    if (!provinceData) return new Set<string>();
    return new Set(provinceData.provinces);
  }, [provinceData]);

  // Match feature province name to data (handles normalization)
  const isProvincePresent = useCallback((featureName: string): boolean => {
    if (presentProvinces.has(featureName)) return true;
    const norm = normalizeProvince(featureName);
    for (const p of presentProvinces) {
      if (normalizeProvince(p) === norm) return true;
    }
    return false;
  }, [presentProvinces]);

  // Assign categorical colors to present provinces
  const provinceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...presentProvinces].sort();
    sorted.forEach((name, i) => {
      map.set(normalizeProvince(name), PROVINCE_COLORS[i % PROVINCE_COLORS.length]);
    });
    return map;
  }, [presentProvinces]);

  function getColor(featureName: string): string {
    return provinceColorMap.get(normalizeProvince(featureName)) ?? "none";
  }

  // Auto-zoom to species region
  useEffect(() => {
    if (!geoData || !provinceData || !pathGenerator || presentProvinces.size === 0 || autoZoomApplied) return;

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
    if (finalW < minW) {
      finalW = minW;
      finalH = finalW / aspect;
    }
    if (finalW > BASE_WIDTH) {
      finalW = BASE_WIDTH;
      finalH = BASE_HEIGHT;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setViewBox(safeViewBox({
      x: cx - finalW / 2,
      y: cy - finalH / 2,
      w: finalW,
      h: finalH,
    }, defaultVB));
    setAutoZoomApplied(true);
  }, [geoData, provinceData, presentProvinces, autoZoomApplied, pathGenerator, isProvincePresent]);

  const defaultVB = { x: 0, y: 0, w: BASE_WIDTH, h: BASE_HEIGHT };

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
      if (svgRect.width === 0 || svgRect.height === 0) return;
      const dx = ((e.clientX - panStart.current.x) / svgRect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.current.y) / svgRect.height) * viewBox.h;
      setViewBox((prev) => safeViewBox({ ...prev, x: panStart.current!.vx - dx, y: panStart.current!.vy - dy }, defaultVB));
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

  if (!geoData || !provinceData || !pathGenerator) {
    return (
      <div className="w-full aspect-[2/1] bg-[#1a1a2e] rounded-lg animate-pulse" />
    );
  }

  // Clean up source: deduplicate comma-separated entries
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
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full"
          style={{ cursor: isPanning ? "grabbing" : "grab", background: "#1a1a2e" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMovePan}
        >
          {/* Land masses */}
          {landData?.features.map((feature, i) => {
            if (!feature.geometry) return null;
            let d: string;
            try { d = pathGenerator(feature.geometry as GeoJSON.Geometry) || ""; } catch { d = ""; }
            if (!d) return null;
            return (
              <path
                key={`land-${i}`}
                d={d}
                fill="#888888"
                stroke="rgba(120,120,120,0.5)"
                strokeWidth={0.3}
                pointerEvents="none"
              />
            );
          })}

          {/* Province polygons ON TOP of land */}
          {geoData.features.map((feature, i) => {
            const provinceName = feature.properties?.PROVINCE;
            if (!provinceName || !feature.geometry) return null;

            let d: string;
            try { d = pathGenerator(feature.geometry as GeoJSON.Geometry) || ""; } catch { d = ""; }
            if (!d) return null;

            const isPresent = isProvincePresent(provinceName);
            const isHovered = hoveredProvince === provinceName;

            const fill = isPresent ? getColor(provinceName) : "none";

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
                      : "rgba(255,255,255,0.1)"
                }
                strokeWidth={isHovered ? 1.5 : isPresent ? 1 : 0.2}
                pointerEvents="all"
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
            className="w-6 h-6 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded text-sm flex items-center justify-center"
            onClick={() => {
              setViewBox((prev) => {
                const newW = Math.max(BASE_WIDTH / MAX_ZOOM, prev.w * 0.75);
                const newH = (newW / BASE_WIDTH) * BASE_HEIGHT;
                const cx = prev.x + prev.w / 2;
                const cy = prev.y + prev.h / 2;
                return safeViewBox({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }, defaultVB);
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
                return safeViewBox({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }, defaultVB);
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

      {/* Source line */}
      {cleanSource && (
        <div className="text-xs text-muted-foreground">
          Source: {cleanSource}
        </div>
      )}
    </div>
  );
}
