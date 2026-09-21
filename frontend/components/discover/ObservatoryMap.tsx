"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, MapPin, Minus, Plus, RotateCcw, Users, X } from "lucide-react";
import type { MapReader, RegionStat, TopBook } from "@/types";
import { avatarById } from "@/lib/avatars";
import { AvatarMark } from "@/components/profile/AvatarMark";
import { BookCover } from "@/components/books/BookCover";
import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";
import { WorldLandmass } from "./WorldLandmass";
import {
  OBS_MAP_W,
  OBS_MAP_H,
  type ViewBox,
  WORLD_VIEWBOX,
  heatColor,
  project,
  viewboxAround,
} from "./observatory-viewport";

export type MapMode = "heat" | "bubbles" | "dark";

const MAX_PERSONAS = 50;
const MAX_PERSONA_LIST = 12;
const ZOOM_STEP = 1.22;
const PULSE_TOP_N = 3;

function regionPlace(region: RegionStat): string {
  return [region.region, region.country].filter(Boolean).join(", ");
}

function readerPlace(reader: MapReader): string {
  return [reader.city, reader.region, reader.country].filter(Boolean).join(", ");
}

/** Persona glyph for HTML overlays (popover + reading rail). Dependency-free SVG
 *  mark inside a gradient chip — no emoji, no third-party icon fonts. */
function PersonaGlyph({ reader, size }: { reader: MapReader; size: number }) {
  const avatar = avatarById(reader.user.avatarId);
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})`,
        boxShadow: "0 4px 14px -6px rgba(0,0,0,0.65)",
      }}
    >
            <AvatarMark mark={avatar.mark} size={Math.max(12, size * 0.56)} />
    </span>
  );
}

/**
 * Dependency-free SVG legend for the Observatory map. Explains the heat
 * gradient, the persona markers, and the fuzzed-coordinate guarantee.
 */
export function ObservatoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-10 rounded-full bg-gradient-to-r from-signal via-accent to-heat-hot" />
        Heat = reading activity
      </span>
      <span className="flex items-center gap-1.5">
        <AvatarMark mark="orbit" size={14} className="text-signal" />
        Avatars = readers active now
      </span>
      <span className="flex items-center gap-1.5">
        <MapPin size={11} className="text-signal" />
        Coordinates fuzzed ~15 km · anonymous by default
      </span>
    </div>
  );
}

/**
 * Viewport state for the SVG curiosity map. Pan/zoom is plain viewBox math on
 * a 2:1 equirectangular plane — there is no mapping library (ADR 0006).
 */
function useViewport(initial?: ViewBox | null) {
  const [vb, setVb] = useState<ViewBox>(() => clampViewbox(initial ?? WORLD_VIEWBOX));
  const [svgWidth, setSvgWidth] = useState(OBS_MAP_W);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>();
  const vbRef = useRef(vb);
  const panRef = useRef<{ x: number; y: number; vb: ViewBox } | null>(null);

  useEffect(() => {
    vbRef.current = vb;
  }, [vb]);

  // Track rendered width so screen-sized decorations stay a constant CSS size.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.contentRect.width > 0) setSvgWidth(e.contentRect.width);
      }
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  // Interaction handlers are attached once on mount.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onDown = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      panRef.current = { x: e.clientX, y: e.clientY, vb: vbRef.current, w: r.width, h: r.height };
    };
    const onMove = (e: PointerEvent) => {
      if (!panRef.current) return;
      const r = svg.getBoundingClientRect();
      const dx = ((e.clientX - panRef.current.x) * panRef.current.vb.w) / r.width;
      const dy = ((e.clientY - panRef.current.y) * panRef.current.vb.h) / r.height;
      setVb(
        clampViewbox({
          x: panRef.current.vb.x - dx,
          y: panRef.current.vb.y - dy,
          w: panRef.current.vb.w,
          h: panRef.current.vb.h,
        }),
      );
    };
    const endPan = () => {
      panRef.current = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const sx = (e.clientX - r.left) / r.width;
      const sy = (e.clientY - r.top) / r.height;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setVb((cur) =>
        clampViewbox({
          x: cur.x + sx * (cur.w - cur.w / factor),
          y: cur.y + sy * (cur.h - cur.h / factor),
          w: cur.w / factor,
          h: cur.h / factor,
        }),
      );
    };
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointercancel", endPan);
    svg.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endPan);
    return () => {
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointercancel", endPan);
      svg.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endPan);
    };
  }, []);

  const wscale = vb.w / svgWidth; // world units per CSS pixel
  const worldPx = (cssPx: number) => cssPx * wscale;

  const flyTo = useCallback((target: ViewBox, duration = 420) => {
    cancelAnimationFrame(rafRef.current);
    const from = vbRef.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setVb(
        clampViewbox({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          w: from.w + (target.w - from.w) * e,
          h: from.h + (target.h - from.h) * e,
        }),
      );
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setVb((cur) =>
      clampViewbox({
        x: cur.x + (cur.w - cur.w / factor) / 2,
        y: cur.y + (cur.h - cur.h / factor) / 2,
        w: cur.w / factor,
        h: cur.h / factor,
      }),
    );
  }, []);

  const panByPercent = useCallback((dx: number, dy: number) => {
    setVb((cur) =>
      clampViewbox({ x: cur.x + dx * cur.w, y: cur.y + dy * cur.h, w: cur.w, h: cur.h }),
    );
  }, []);

  const reset = useCallback(() => flyTo(WORLD_VIEWBOX), [flyTo]);

  return { vb, svgRef, worldPx, flyTo, zoomBy, panByPercent, reset   };
}

export function ObservatoryMap({
  regions,
  readers = [],
  mode = "heat",
  height = 560,
  interactive = true,
  selected = null,
  onSelect,
  topBooks = [],
  initialView,
  overlayStats = null,
}: {
  regions: RegionStat[];
  readers?: MapReader[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks?: TopBook[];
  initialView?: ViewBox | null;
  overlayStats?: { readers: number; regions: number } | null;
}) {
  const { vb, svgRef, worldPx, flyTo, zoomBy, panByPercent, reset } =
    useViewport(initialView);
  const [activeReader, setActiveReader] = useState<MapReader | null>(null);

  const plotted = useMemo(
    () => regions.filter((r) => r.lat !== null && r.lng !== null),
    [regions],
  );
  const max = useMemo(
    () => Math.max(1, ...plotted.map((r) => r.activeReaders)),
    [plotted],
  );
  const personas = useMemo(() => readers.slice(0, MAX_PERSONAS), [readers]);
  const personaList = useMemo(
    () => personas.slice(0, MAX_PERSONA_LIST),
    [personas],
  );

  const hotKeys = useMemo(
    () =>
      new Set(
        plotted
          .slice()
          .sort((a, b) => b.activeReaders - a.activeReaders)
          .slice(0, PULSE_TOP_N)
          .map((r) => `${r.country}|${r.region}`),
      ),
    [plotted],
  );

  // Fly to the selected region (driven by URL params / clicks).
  useEffect(() => {
    if (!selected) {
      reset();
      return;
    }
    if (selected.lat === null || selected.lng === null) return;
    const targetSpan = Math.max(
      96,
      Math.min(OBS_MAP_W * 0.45, 680 / Math.sqrt(1 + selected.activeReaders)),
    );
    flyTo(viewboxAround(selected.lat, selected.lng, targetSpan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, flyTo, reset]);

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!interactive) return;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        panByPercent(-0.12, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        panByPercent(0.12, 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        panByPercent(0, -0.12);
        break;
      case "ArrowDown":
        e.preventDefault();
        panByPercent(0, 0.12);
        break;
      case "+":
      case "=":
        e.preventDefault();
        zoomBy(ZOOM_STEP);
        break;
      case "-":
      case "_":
        e.preventDefault();
        zoomBy(1 / ZOOM_STEP);
        break;
      case "0":
      case "Home":
        e.preventDefault();
        reset();
        break;
      default:
        break;
    }
    };

  const dark = mode === "dark";

  return (
    <div
      className={cn(
        "map-dark-frame relative",
        height <= 0 ? "map-fullbleed" : "",
      )}
      style={height > 0 ? { height } : undefined}
    >
      <svg
        ref={svgRef}
        className={cn(
          "map-world-viewport block",
          height <= 0 ? "h-full w-full" : "w-full",
        )}
        style={height > 0 ? { height } : undefined}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="World map of readers. Drag to pan, scroll or pinch to zoom. Coordinates are fuzzed to a ~15 km grid."
        tabIndex={interactive ? 0 : -1}
        onKeyDown={onKeyDown}
        onClick={() => onSelect?.(null)}
      >
        {/* Ocean */}
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="var(--color-stage)"
        />
        {/* Sparse graticule */}
        <g
          className="map-graticule"
          stroke="var(--color-line-2)"
          strokeOpacity={0.18}
          fill="none"
        >
          {Array.from({ length: 13 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={(i / 12) * OBS_MAP_W}
              x2={(i / 12) * OBS_MAP_W}
              y1={0}
              y2={OBS_MAP_H}
            />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              x2={OBS_MAP_W}
              y1={(i / 8) * OBS_MAP_H}
              y2={(i / 8) * OBS_MAP_H}
            />
          ))}
        </g>

        {/* Curated low-poly landmass (dependency-free silhouette) */}
                <WorldLandmass />

        {/* Region heat blobs — rendered at fuzzed coordinates only. */}
        {plotted.map((region, i) => {
          const intensity = region.activeReaders / max;
          const key = `${region.country}|${region.region}`;
          const color = heatColor(intensity);
          const { x, y } = project(region.lat!, region.lng!);
          const bloomR = worldPx(18 + intensity * 22);
          const coreR = worldPx(4 + intensity * 9);
          const isSelected =
            selected?.country === region.country &&
            selected?.region === region.region;
          const hot = hotKeys.has(key);

          if (mode === "bubbles") {
            const ringR = worldPx(10 + intensity * 14);
            return (
              <g
                key={`${key}-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(isSelected ? null : region);
                }}
                style={{ cursor: interactive ? "pointer" : "default" }}
              >
                <title>{`${regionPlace(region)} — ${region.activeReaders} readers`}</title>
                <circle
                  cx={x}
                  cy={y}
                  r={ringR}
                  fill="none"
                  stroke={color}
                  strokeWidth={worldPx(1.6)}
                  opacity={0.9}
                />
                <circle cx={x} cy={y} r={coreR} fill={color} />
              </g>
            );
          }

          // heat / dark
          const glow = dark ? 0.16 : 0.3;
          return (
            <g
              key={`${key}-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(isSelected ? null : region);
              }}
              style={{ cursor: interactive ? "pointer" : "default" }}
            >
              <title>{`${regionPlace(region)} — ${region.activeReaders} readers`}</title>
              <circle cx={x} cy={y} r={bloomR} fill={color} opacity={glow} />
              {hot && !isSelected ? (
                <circle
                  cx={x}
                  cy={y}
                  r={worldPx(28)}
                  className="anim-pulse-ring"
                  style={{ transformBox: "fill-box" }}
                  stroke="var(--color-signal)"
                  strokeWidth={worldPx(1.4)}
                  fill="none"
                  opacity={0.45}
                />
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? coreR * 1.5 : coreR}
                fill={isSelected ? "var(--color-ink-strong)" : color}
              />
            </g>
                      );
        })}

        {/* Persona markers (anonymous, rendered at fuzzed coordinates) */}
        {personas.map((reader) => {
          const a = avatarById(reader.user.avatarId);
          const { x, y } = project(reader.lat, reader.lng);
          const gradId = `pgrad-${reader.user.id}`;
          const ringR = worldPx(16);
          const markW = worldPx(22);
          const active = activeReader?.user.id === reader.user.id;
          return (
            <g
              key={reader.user.id}
              transform={`translate(${x} ${y})`}
              onClick={(e) => {
                e.stopPropagation();
                if (interactive) setActiveReader(reader);
              }}
              style={{ cursor: interactive ? "pointer" : "default" }}
            >
              <title>
                {reader.user.displayName} — {reader.books.length} book
                {reader.books.length === 1 ? "" : "s"} currently reading
              </title>
              <defs>
                <radialGradient id={gradId}>
                  <stop offset="0%" stopColor={a.from} />
                  <stop offset="100%" stopColor={a.to} />
                </radialGradient>
              </defs>
              <circle cx={0} cy={0} r={ringR} fill={`url(#${gradId})`} />
              {active ? (
                <circle
                  cx={0}
                  cy={0}
                  r={worldPx(24)}
                  className="anim-pulse-ring"
                  style={{ transformBox: "fill-box" }}
                  stroke={a.from}
                  strokeWidth={worldPx(1.5)}
                  fill="none"
                  opacity={0.5}
                />
              ) : null}
                            <g transform={`translate(${-markW / 2} ${-markW / 2})`}>
                <AvatarMark mark={a.mark} size={markW} className="text-white" />
              </g>
            </g>
          );
        })}
      </svg>

      {/* Bottom control bar: zoom, attribution, live count. */}
      <div className="pointer-events-auto absolute left-1/2 bottom-3 z-20 flex items-center gap-1.5 rounded-full border border-line bg-stage/75 px-3 py-1.5 backdrop-blur-md">
        <button
          type="button"
          aria-label="Reset world view"
          onClick={reset}
          className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-faint hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RotateCcw size={14} />
        </button>
        <span className="h-4 w-px bg-line-2" />
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBy(ZOOM_STEP)}
          className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-faint hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-faint hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Minus size={15} />
        </button>
        <span className="h-px flex-1 bg-line-2" />
        <span className="text-[10px] font-medium text-ink-faint">
          Fuzzed ~15 km · anonymous by default
        </span>
        {overlayStats ? (
          <span className="text-[10px] text-ink-muted">
            · <strong>{overlayStats.readers}</strong> reading ·{" "}
            <strong>{overlayStats.regions}</strong> regions
          </span>
                ) : null}
      </div>

      {/* "Reading now" rail — hidden when a region is selected so the page's
          bottom sheet can surface that region's books instead. */}
      {!selected && personaList.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-16 z-20 mx-auto max-w-2xl">
          <div className="persona-rail pointer-events-auto">
            <p className="persona-rail-head">
              <Users size={12} /> Reading now · {personas.length} personas
            </p>
            <div className="persona-rail-track">
              {personaList.map((reader) => {
                const place = readerPlace(reader);
                const book = reader.books[0];
                return (
                  <button
                    key={reader.user.id}
                    type="button"
                    onClick={() => setActiveReader(reader)}
                    className="persona-chip shrink-0 rounded-full border border-line bg-white/5 py-1.5 pl-1.5 pr-3 text-left transition hover:border-accent"
                    aria-label={`${reader.user.displayName}${place ? ` in ${place}` : ""}${book ? ` reading ${book.title}` : ""}. Activate to see what they are reading.`}
                  >
                    <PersonaGlyph reader={reader} size={30} />
                    <span className="min-w-0 max-w-[150px]">
                      <span className="p-name block">{reader.user.displayName}</span>
                      <span className="p-loc block">
                        {place || "Somewhere curious"}
                        {book ? ` · ${book.title}` : ""}
                      </span>
                    </span>
                    {book ? <BookCover book={book} size={22} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Active-reader popover (centred under the hero, clear of sidebars) */}
      {activeReader ? (
        <div className="pointer-events-auto absolute left-1/2 top-16 z-20 w-[300px] max-w-[calc(100%-24px)] -translate-x-1/2">
          <PersonaPopover
            reader={activeReader}
            onClose={() => setActiveReader(null)}
          />
        </div>
      ) : null}

      {/* Optional trending books rail (surfaced by callers via topBooks) */}
      {topBooks.length > 0 ? (
        <div className="pointer-events-none absolute bottom-32 inset-x-3 z-20 mx-auto max-w-2xl">
          <div className="no-scrollbar pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-2xl border border-line bg-stage/85 px-4 py-3 backdrop-blur-md">
            <div className="flex shrink-0 items-center gap-1.5 pr-2">
              <span className="h-2 w-2 rounded-full bg-heat-hot animate-ping" />
              <span className="text-xs font-bold text-ink-muted">TRENDING</span>
            </div>
            {topBooks.slice(0, 7).map((b) => (
              <Link
                key={b.id}
                href={`/books/${b.id}`}
                className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-stage/80 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent hover:bg-white/5"
              >
                <BookCover book={b} size={20} />
                <span className="max-w-[120px] truncate">{b.title}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}





