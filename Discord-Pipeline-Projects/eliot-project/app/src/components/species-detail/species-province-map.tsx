"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { geoPath, geoGraticule, type GeoPermissibleObjects } from "d3-geo";
// @ts-expect-error d3-geo-projection has no type declarations
import { geoRobinson } from "d3-geo-projection";

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

export function SpeciesProvinceMap({ speciesId }: SpeciesProvinceMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<SpeciesProvinceResponse | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom/pan state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 450 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const BASE_WIDTH = 900;
  const BASE_HEIGHT = 450;
  const MAX_ZOOM = 6;

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
    fetch(`/api/species/${encodeURIComponent(speciesId)}/provinces`)
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(console.error);
  }, [speciesId]);

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

  const presentProvinces = useMemo(
    () => new Set(provinceData?.provinces ?? []),
    [provinceData]
  );

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.18;
      const newW = Math.max(BASE_WIDTH / MAX_ZOOM, Math.min(BASE_WIDTH, viewBox.w * zoomFactor));
      const newH = (newW / BASE_WIDTH) * BASE_HEIGHT;

      const mx = ((e.clientX - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x;
      const my = ((e.clientY - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y;
      const newX = mx - ((e.clientX - svgRect.left) / svgRect.width) * newW;
      const newY = my - ((e.clientY - svgRect.top) / svgRect.height) * newH;

      setViewBox({ x: newX, y: newY, w: newW, h: newH });
    },
    [viewBox]
  );

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

  if (!geoData || !provinceData) {
    return (
      <div className="w-full aspect-[2/1] bg-[#1a1a2e] rounded-lg animate-pulse" />
    );
  }

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
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMovePan}
        >
          {/* Ocean */}
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
            const isPresent = presentProvinces.has(provinceName);
            const isHovered = hoveredProvince === provinceName;

            return (
              <path
                key={i}
                d={pathGenerator(feature.geometry as GeoJSON.Geometry) || ""}
                fill={isPresent ? "#7cb5ec" : "none"}
                fillOpacity={isPresent ? 0.7 : 0}
                stroke={
                  isHovered
                    ? "rgba(255,255,255,0.8)"
                    : "rgba(200,200,200,0.2)"
                }
                strokeWidth={isHovered ? 1 : 0.3}
                pointerEvents="all"
                onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                onMouseLeave={() => { setHoveredProvince(null); setTooltipPos(null); }}
              />
            );
          })}

          {/* Land masses */}
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
              top: tooltipPos.y - 25,
              transform: tooltipPos.x > 250 ? "translateX(-110%)" : undefined,
            }}
          >
            <div className="font-medium">{hoveredProvince}</div>
            <div className="text-white/70">
              {presentProvinces.has(hoveredProvince) ? "Present" : "Absent"}
            </div>
          </div>
        )}
      </div>

      {/* Source line */}
      <div className="text-xs text-muted-foreground">
        Source: {provinceData.source}
      </div>
    </div>
  );
}
