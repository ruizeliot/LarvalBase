"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { geoPath, geoIdentity } from "d3-geo";
import { TRAIT_BY_SLUG } from "@/lib/data/trait-config";
import { getProvinceDisplayName } from "@/lib/constants/provinces";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";

/* ── Color ramp (YlOrRd) ── */
const YLOR_RD_COLORS = [
  [255, 255, 204],
  [255, 237, 160],
  [254, 217, 118],
  [254, 178, 76],
  [253, 141, 60],
  [252, 78, 42],
  [227, 26, 28],
  [177, 0, 38],
];

function getPercentageColor(pct: number): string {
  if (pct <= 0) return "transparent";
  const t = Math.min(100, Math.max(0, pct)) / 100;
  const idx = t * (YLOR_RD_COLORS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, YLOR_RD_COLORS.length - 1);
  const f = idx - lo;
  const r = Math.round(YLOR_RD_COLORS[lo][0] * (1 - f) + YLOR_RD_COLORS[hi][0] * f);
  const g = Math.round(YLOR_RD_COLORS[lo][1] * (1 - f) + YLOR_RD_COLORS[hi][1] * f);
  const b = Math.round(YLOR_RD_COLORS[lo][2] * (1 - f) + YLOR_RD_COLORS[hi][2] * f);
  return `rgb(${r},${g},${b})`;
}

/* ── Types ── */
interface ProvinceStatData {
  traitCount: number;
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

/* ── Constants ── */
const BASE_WIDTH = 900;
const BASE_HEIGHT = 450;
const MAX_ZOOM = 6;
const VIEWBOX = `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`;
const BG_COLOR = "#0D0D0D";

function normalizeProvince(name: string): string {
  return name.replace(/[-/,.·\u00a0]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}

function applyTransform(
  gEl: SVGGElement | null,
  t: { x: number; y: number; scale: number }
) {
  if (!gEl) return;
  if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.scale) || t.scale <= 0) {
    t.x = 0; t.y = 0; t.scale = 1;
  }
  gEl.setAttribute("transform", `translate(${t.x},${t.y}) scale(${t.scale})`);
}

export default function TraitPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const config = TRAIT_BY_SLUG.get(slug);

  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [landData, setLandData] = useState<GeoFeatureCollection | null>(null);
  const [provinceData, setProvinceData] = useState<Record<string, ProvinceStatData> | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [exportingIdx, setExportingIdx] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);

  // Load GeoJSON
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

  // Load trait province stats
  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    fetch(`/api/traits/${slug}/stats`)
      .then((r) => r.json())
      .then((data) => {
        setProvinceData(data.provinces ?? {});
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Trait stats load error:", err);
        setIsLoading(false);
      });
  }, [slug]);

  const projection = useMemo(() => {
    if (!geoData) return null;
    return geoIdentity()
      .reflectY(true)
      .fitSize([BASE_WIDTH, BASE_HEIGHT], geoData as unknown as GeoJSON.FeatureCollection);
  }, [geoData]);

  const pathGenerator = useMemo(
    () => (projection ? geoPath().projection(projection) : null),
    [projection]
  );

  const provincePaths = useMemo(() => {
    if (!pathGenerator || !geoData) return [];
    return geoData.features
      .map((feature) => {
        const name = feature.properties?.PROVINCE;
        if (!name || !feature.geometry) return null;
        try {
          const d = pathGenerator(feature.geometry as GeoJSON.Geometry) || "";
          return d ? { name, d } : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as { name: string; d: string }[];
  }, [pathGenerator, geoData]);

  const landPaths = useMemo(() => {
    if (!pathGenerator || !landData) return [];
    return landData.features
      .map((feature) => {
        if (!feature.geometry) return null;
        try {
          const d = pathGenerator(feature.geometry as GeoJSON.Geometry) || "";
          return d || null;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];
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

  const getProvinceInfo = useCallback(
    (featureName: string): ProvinceStatData | null => {
      if (!provinceData) return null;
      if (provinceData[featureName]) return provinceData[featureName];
      const canonical = provinceNormMap.get(normalizeProvince(featureName));
      if (canonical) return provinceData[canonical] ?? null;
      return null;
    },
    [provinceData, provinceNormMap]
  );

  // Min/Max percentage for relative color scaling
  const { minPercentage, maxPercentage } = useMemo(() => {
    if (!provinceData) return { minPercentage: 0, maxPercentage: 100 };
    let min = Infinity;
    let max = 0;
    for (const data of Object.values(provinceData)) {
      if (data.percentage > 0) {
        if (data.percentage < min) min = data.percentage;
        if (data.percentage > max) max = data.percentage;
      }
    }
    if (min === Infinity) min = 0;
    return { minPercentage: min, maxPercentage: Math.max(max, 1) };
  }, [provinceData]);

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
      } else {
        setSelectedProvince(provinceName);
      }
    },
    [selectedProvince, getProvinceInfo]
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

  // Export handler
  const handleExport = useCallback(
    async (fileIdx: number) => {
      if (!config) return;
      setExportingIdx(fileIdx);
      try {
        const params = new URLSearchParams({ file: String(fileIdx) });
        if (selectedProvince) {
          params.set('province', selectedProvince);
        }
        const url = `/api/traits/${slug}/export?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert((err as { error?: string }).error || "Export failed");
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const filenameMatch = disposition.match(/filename="(.+?)"/);
        const downloadName = filenameMatch ? filenameMatch[1] : `${slug}_export.tsv`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (err) {
        console.error("Export error:", err);
        alert("Export failed");
      } finally {
        setExportingIdx(null);
      }
    },
    [selectedProvince, slug, config]
  );

  const handleSelectSpecies = useCallback(
    (species: { id: string; scientificName: string }) => {
      router.push(`/species/${species.id}`);
    },
    [router]
  );

  if (!config) {
    return (
      <MainLayout sidebar={<AppSidebar onSelectSpecies={handleSelectSpecies} />}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Trait not found</h1>
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Back to homepage
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={handleSelectSpecies} />}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to homepage
        </Link>

        {/* Header with icon */}
        <div className="flex items-center gap-3">
          {config.iconPath && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={config.iconPath}
              alt=""
              width={48}
              height={48}
              style={{ opacity: 0.85, filter: "brightness(0) invert(1)" }}
            />
          )}
          <h1 className="text-2xl font-bold text-white">{config.displayName}</h1>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed text-justify">
          {config.description}
        </p>

        {/* Province map */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Percentage of species with {config.displayName.toLowerCase()}{config.displayName.toLowerCase().endsWith('data') ? '' : ' data'} per region (click to select)
          </h3>

          {selectedProvince && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Selected: <span className="text-white font-medium">{getProvinceDisplayName(selectedProvince)}</span>
              </span>
              <button
                className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
                onClick={() => setSelectedProvince(null)}
              >
                Clear selection
              </button>
            </div>
          )}

          <div
            className="relative overflow-hidden rounded-lg border border-border/50"
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp();
              setHoveredProvince(null);
              setTooltipPos(null);
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                <div className="text-sm text-white/70">Loading...</div>
              </div>
            )}
            {(!geoData || !pathGenerator) ? (
              <div className="w-full aspect-[2/1] bg-[#0D0D0D] rounded-lg animate-pulse" />
            ) : (
              <svg
                ref={svgRef}
                viewBox={VIEWBOX}
                className="w-full"
                style={{ cursor: isPanning ? "grabbing" : "grab", background: BG_COLOR }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
              >
                <g ref={gRef} transform="translate(0,0) scale(1)">
                  {provincePaths.map(({ name: provinceName, d }, i) => {
                    const info = getProvinceInfo(provinceName);
                    const hasData = info && info.species.length > 0;
                    const isHovered = hoveredProvince === provinceName;
                    const isSelected = selectedProvince === provinceName;
                    const pct = info?.percentage ?? 0;

                    const range = maxPercentage - minPercentage;
                    const normalizedPct =
                      range > 0 ? ((pct - minPercentage) / range) * 100 : 50;
                    const fill = hasData
                      ? getPercentageColor(Math.max(normalizedPct, 1))
                      : "transparent";

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
                        strokeWidth={
                          isSelected ? 2 : isHovered ? 1.5 : hasData ? 0.8 : 0.2
                        }
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="all"
                        style={{ cursor: hasData ? "pointer" : "default" }}
                        onClick={() => handleProvinceClick(provinceName)}
                        onMouseMove={(e) => handleMouseMoveTooltip(e, provinceName)}
                        onMouseLeave={() => {
                          setHoveredProvince(null);
                          setTooltipPos(null);
                        }}
                      />
                    );
                  })}

                  {/* Land masses ON TOP */}
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
            )}

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
                <div className="font-medium">
                  {getProvinceDisplayName(hoveredProvince)}
                </div>
                {(() => {
                  const info = getProvinceInfo(hoveredProvince);
                  if (!info || info.species.length === 0) {
                    return (
                      <div className="text-white/50">No species with data</div>
                    );
                  }
                  return (
                    <div className="text-white/70">
                      {info.traitCount} species with {config.displayName.toLowerCase()}{config.displayName.toLowerCase().endsWith('data') ? '' : ' data'} ({info.percentage.toFixed(1)}% of {info.totalCount} species in province)
                    </div>
                  );
                })()}
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
                &#x21BA;
              </button>
            </div>

            {/* Color legend */}
            <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 flex items-center gap-1.5">
              <span className="text-[9px] text-white/60">
                {minPercentage.toFixed(1)}%
              </span>
              <div
                className="w-24 h-2.5 rounded-sm"
                style={{
                  background: `linear-gradient(to right, ${getPercentageColor(1)}, ${getPercentageColor(25)}, ${getPercentageColor(50)}, ${getPercentageColor(75)}, ${getPercentageColor(100)})`,
                }}
              />
              <span className="text-[9px] text-white/60">
                {maxPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="space-y-3">
          {config.databaseFiles.map((_, idx) => {
            // Dynamic label: replace "in the selected area" with province name or "whole world"
            const baseLabel = config.exportLabels[idx];
            const label = selectedProvince
              ? baseLabel.replace('in the selected area', `in ${getProvinceDisplayName(selectedProvince)}`)
              : baseLabel.replace('in the selected area', '(whole world)');
            return (
              <button
                key={idx}
                disabled={exportingIdx !== null}
                onClick={() => handleExport(idx)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingIdx === idx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
