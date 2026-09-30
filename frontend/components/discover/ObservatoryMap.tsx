"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Minus, Plus, RotateCcw, Users, X } from "lucide-react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { MapReader, RegionStat, TopBook } from "@/types";
import { avatarById } from "@/lib/avatars";
import { AvatarMark, avatarMarkSvg } from "@/components/profile/AvatarMark";
import { BookCover } from "@/components/books/BookCover";
import { CountUp } from "@/components/ui/CountUp";
import { useAuth } from "@/components/providers/AuthProvider";
import { ipCountry } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import {
  MAP_LOCAL_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_SELECTION_ZOOM,
  MAP_WORLD_CENTER,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  heatColor,
  heatCoreRadius,
  heatHaloRadius,
  heatRadius,
  readerPlace,
  regionPlace,
  type MapView,
} from "./map-style";

export type { MapView } from "./map-style";

/**
 * Map layer modes. `heat` is the default glow, `bubbles` is a ring-and-core
 * read for dense regions, `dark` mutes the overlay so the basemap stays
 * readable underneath.
 */
export type MapMode = "heat" | "bubbles" | "dark";

type LeafletModule = typeof import("leaflet");

declare global {
  interface Window {
    __curioMap?: {
      readonly ready: boolean;
      getZoom: () => number | null;
      getBounds: () => { south: number; west: number; north: number; east: number } | null;
      countMarkers: () => number;
      countBlooms: () => number;
      clickFirstBloom: () => boolean;
      clickFirstMarker: () => boolean;
    };
  }
}

const MAX_PERSONAS = 50;
const MAX_PERSONA_LIST = 12;
const PULSE_TOP_N = 3;

/** Native depth of the OSM raster pyramid; the map itself stops at MAP_MAX_ZOOM. */
const MAX_TILE_ZOOM = 19;

/** Persona glyph for HTML surfaces (popover + reading rail). Dependency-free
 *  SVG mark inside a gradient chip — no emoji, no third-party icon fonts. */
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
 * Marker markup for `L.divIcon`. Same avatar geometry as `PersonaGlyph`
 * (`avatarMarkSvg` shares one source with the React component), built as a
 * string because Leaflet owns the marker DOM. No reader-supplied string ever
 * reaches this: only curated avatar gradients, developer-authored SVG, and the
 * numeric book count.
 */
function personaIconHtml(reader: MapReader): string {
  const avatar = avatarById(reader.user.avatarId);
  const books = reader.books.length;
  return [
    '<span class="map-reader-ring"></span>',
    `<span class="map-reader-avatar" style="background:linear-gradient(135deg, ${avatar.from}, ${avatar.to})">${avatarMarkSvg(avatar.mark, 18)}</span>`,
    books > 0 ? `<span class="map-reader-count">${books}</span>` : "",
  ].join("");
}

/**
 * Owns the Leaflet map instance and keeps every layer in sync with React state.
 *
 * Deliberate choices:
 * - `leaflet` is imported dynamically *inside* the effect, never at module
 *   scope, so the package can never be evaluated during SSR (`/discover/global`
 *   imports this module for its `MapMode` type, and Leaflet touches `window`).
 * - The map is created once and mutated by the sync effects; callbacks flow
 *   through a ref so a parent re-render never tears down the map.
 * - OSM attribution stays enabled and visible (OSMF tile usage policy §2), and
 *   nothing here sends `Cache-Control: no-cache` (policy §3.2).
 */
function useCurioMap({
  interactive,
  initialView,
  regions,
  readers,
  mode,
  selected,
  activeReaderId,
  focusOnVisitor,
  onSelect,
  navigateOnSelect,
  onPickReader,
}: {
  interactive: boolean;
  initialView: MapView | null;
  regions: RegionStat[];
  readers: MapReader[];
  mode: MapMode;
  selected: RegionStat | null;
  activeReaderId: string | null;
  focusOnVisitor: boolean;
  onSelect?: (region: RegionStat | null) => void;
  navigateOnSelect: boolean;
  onPickReader: (reader: MapReader) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const regionLayerRef = useRef<LayerGroup | null>(null);
  const personaLayerRef = useRef<LayerGroup | null>(null);
  const handlersRef = useRef({
    onSelect,
    navigateOnSelect,
    onPickReader,
    interactive,
    initialView,
  });
  const firstFlyRef = useRef(true);
  /**
   * Leaflet propagates a layer's click to the map's own `click` handler in the
   * same DOM dispatch. Without this guard, selecting a region would immediately
   * fire the background-deselect handler and snap back to the world view —
   * caught by `scripts/verify-map-live.mjs`. The flag lives exactly one
   * microtask (i.e. one event dispatch) so genuine background clicks still
   * clear the selection.
   */
  const layerClickGuardRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [visitorCountry, setVisitorCountry] = useState<string | null>(null);

  // Callbacks live in a ref so the map instance survives re-renders. Declared
  // before the creation effect so the first mount already sees current values.
  useEffect(() => {
    handlersRef.current = { onSelect, navigateOnSelect, onPickReader, interactive, initialView };
  }, [onSelect, navigateOnSelect, onPickReader, interactive, initialView]);

  const handleRegionClick = useCallback(
    (region: RegionStat, isSelected: boolean) => {
      layerClickGuardRef.current = true;
      queueMicrotask(() => {
        layerClickGuardRef.current = false;
      });
      const { navigateOnSelect: navigate, onSelect: select } = handlersRef.current;
      if (navigate) {
        const params = new URLSearchParams({ country: region.country });
        if (region.region) params.set("region", region.region);
        router.push(`/discover/global?${params.toString()}`);
        return;
      }
      select?.(isSelected ? null : region);
    },
    [router],
  );

  // 1) Create the map + tile layer once. StrictMode double-mount safe.
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      const container = containerRef.current;
      if (disposed || !container) return;

      const start = handlersRef.current.initialView;
      const map = L.map(container, {
        center: start ? [start.lat, start.lng] : MAP_WORLD_CENTER,
        zoom: start ? start.zoom : MAP_MIN_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        // City-area ceiling: the ~15 km fuzz grid is the finest data we hold.
        maxZoom: MAP_MAX_ZOOM,
        zoomControl: false,
        attributionControl: true,
        worldCopyJump: true,
        scrollWheelZoom: handlersRef.current.interactive,
        dragging: handlersRef.current.interactive,
        doubleClickZoom: handlersRef.current.interactive,
        keyboard: handlersRef.current.interactive,
      });

      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAX_TILE_ZOOM,
        detectRetina: true,
      }).addTo(map);

      map.on("click", () => {
        // Ignore the same-dispatch propagation from a region/marker click.
        if (layerClickGuardRef.current) return;
        handlersRef.current.onSelect?.(null);
      });

      leafletRef.current = L;
      mapRef.current = map;
      regionLayerRef.current = L.layerGroup().addTo(map);
      personaLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      regionLayerRef.current = null;
      personaLayerRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
  }, []);

  // Exposed for the headless map e2e probe (`scripts/verify-map-live.mjs`, local
  // only). Set synchronously alongside the refs so automation can observe the
  // engine state without racing React renders. Never read by product code.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__curioMap = {
        get ready() {
          return ready;
        },
        getZoom: () => mapRef.current?.getZoom() ?? null,
        getBounds: () => {
          const bounds = mapRef.current?.getBounds();
          return bounds
            ? {
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast(),
              }
            : null;
        },
        countMarkers: () =>
          document.querySelectorAll(".leaflet-marker-icon.map-reader-marker").length,
        countBlooms: () =>
          document.querySelectorAll(".leaflet-overlay-pane .curio-heat-pulse").length,
        clickFirstBloom: () => {
          const el = document.querySelector<HTMLElement>(
            ".leaflet-overlay-pane .curio-heat-pulse",
          );
          el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return el !== null;
        },
        clickFirstMarker: () => {
          const el = document.querySelector<HTMLElement>(".leaflet-marker-icon.map-reader-marker");
          el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return el !== null;
        },
      };
    }
    return () => {
      if (typeof window !== "undefined" && window.__curioMap) {
        delete window.__curioMap;
      }
    };
  }, [ready]);

  // 2) Keep Leaflet's viewport in step with layout changes (card + full-bleed).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready]);

  // 3) Region blooms at fuzzed coordinates only. Radii are screen pixels
  //    (`circleMarker`), so the heat layer is visible at every zoom level.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = regionLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();

    // Only fuzzed, plottable regions ever reach the map.
    const plotted = regions.filter(
      (region): region is RegionStat & { lat: number; lng: number } =>
        region.lat !== null && region.lng !== null,
    );
    const max = Math.max(1, ...plotted.map((region) => region.activeReaders));
    const hot = new Set(
      plotted
        .slice()
        .sort((a, b) => b.activeReaders - a.activeReaders)
        .slice(0, PULSE_TOP_N)
        .map((region) => `${region.country}|${region.region}`),
    );

    for (const region of plotted) {
      const intensity = region.activeReaders / max;
      const isSelected =
        selected?.country === region.country && selected?.region === region.region;
      const color = heatColor(intensity);
      const pulse = cn("curio-heat-pulse", isSelected && "curio-heat-selected");

      // Bloom (`heat` / `dark`) or ring (`bubbles`). This is the interactive
      // layer: tooltip, click-to-select, and the heartbeat animation.
      const bloomOpacity =
        mode === "dark" ? 0.16 : mode === "heat" ? (isSelected ? 0.7 : 0.3) : 0.06;
      const bloom = L.circleMarker([region.lat, region.lng], {
        radius: heatRadius(intensity),
        color,
        weight: mode === "bubbles" ? (isSelected ? 2.6 : 1.8) : isSelected ? 2.4 : 1.2,
        opacity: mode === "dark" ? 0.5 : 0.85,
        fillColor: color,
        // `bubbles` reads as a ring; 0.06 keeps the whole disc clickable.
        fillOpacity: isSelected && mode !== "bubbles" ? Math.max(bloomOpacity, 0.55) : bloomOpacity,
        className: pulse,
        interactive,
      });
      bloom.bindTooltip(regionTooltip(region), {
        sticky: true,
        direction: "top",
        opacity: 0.96,
        className: "curio-map-tooltip",
      });
      bloom.on("click", () => handleRegionClick(region, isSelected));
      bloom.addTo(layer);

      // Core dot, matching the Observatory look (fills / strokes live in CSS so
      // theme tokens stay the single source of colour).
      L.circleMarker([region.lat, region.lng], {
        radius: isSelected ? heatCoreRadius(intensity) * 1.5 : heatCoreRadius(intensity),
        stroke: false,
        color,
        fillColor: color,
        fillOpacity: 0.95,
        className: cn("curio-heat-core", isSelected && "curio-heat-core-selected"),
        interactive: false,
      }).addTo(layer);

      // Pulsing halo around the hottest regions.
      if (hot.has(`${region.country}|${region.region}`) && !isSelected) {
        L.circleMarker([region.lat, region.lng], {
          radius: heatHaloRadius(intensity),
          color,
          weight: 1.4,
          opacity: 0.4,
          fill: false,
          className: cn("curio-heat-halo", "curio-heat-pulse"),
          interactive: false,
        }).addTo(layer);
      }
    }
  }, [regions, selected, mode, interactive, ready, handleRegionClick]);

  // 4) Persona avatars: privacy-safe display names at fuzzed coordinates only.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = personaLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();

    for (const reader of readers.slice(0, MAX_PERSONAS)) {
      const active = reader.user.id === activeReaderId;
      const books = reader.books.length;
      const marker = L.marker([reader.lat, reader.lng], {
        icon: L.divIcon({
          className: cn("map-reader-marker", active && "map-reader-marker-active"),
          html: personaIconHtml(reader),
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
        keyboard: interactive,
        riseOnHover: true,
        zIndexOffset: active ? 600 : 400,
        title: `${reader.user.displayName} — ${books} book${books === 1 ? "" : "s"} currently reading`,
      });
      marker.on("click", () => {
        layerClickGuardRef.current = true;
        queueMicrotask(() => {
          layerClickGuardRef.current = false;
        });
        handlersRef.current.onPickReader(reader);
      });
      marker.addTo(layer);
    }
  }, [readers, activeReaderId, interactive, ready]);

  // 5) Fly to the selected region; return to the world view when cleared.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (selected && selected.lat !== null && selected.lng !== null) {
      map.flyTo([selected.lat, selected.lng], MAP_SELECTION_ZOOM, { duration: 0.7 });
      firstFlyRef.current = false;
      return;
    }
    // Never stomp a caller-provided `initialView` on the first paint.
    if (firstFlyRef.current) {
      firstFlyRef.current = false;
      return;
    }
    map.flyTo(MAP_WORLD_CENTER, MAP_MIN_ZOOM, { duration: 0.6 });
  }, [selected, ready]);

  // 6) focusOnVisitor: IP country hint, then the reader's own fuzzed area.
  useEffect(() => {
    if (!focusOnVisitor) return;
    let cancelled = false;
    ipCountry()
      .then((result) => {
        if (!cancelled && result.country) setVisitorCountry(result.country);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [focusOnVisitor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusOnVisitor) return;

    const own = user?.location;
    if (own?.latFuzzed != null && own?.lngFuzzed != null) {
      map.flyTo([own.latFuzzed, own.lngFuzzed], MAP_LOCAL_ZOOM, { duration: 0.7 });
      return;
    }

    const match = visitorCountry
      ? regions.find(
          (region) =>
            region.country === visitorCountry && region.lat !== null && region.lng !== null,
        )
      : undefined;
    if (match && match.lat !== null && match.lng !== null) {
      map.flyTo([match.lat, match.lng], MAP_LOCAL_ZOOM, { duration: 0.7 });
    }
  }, [ready, focusOnVisitor, user?.location, regions, visitorCountry]);

  const reset = useCallback(() => {
    mapRef.current?.flyTo(MAP_WORLD_CENTER, MAP_MIN_ZOOM, { duration: 0.6 });
  }, []);
  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);
  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  return { containerRef, ready, reset, zoomIn, zoomOut };
}

/**
 * The curiosity map: OpenStreetMap raster basemap (Leaflet) with fuzzed region
 * blooms, persona avatars and reader popovers layered on top.
 *
 * Everything except the basemap layer itself is plain DOM: the reading-now rail,
 * persona popover, trending rail and zoom controls stay keyboard-reachable and
 * keep the Observatory chrome. Coordinates are fuzzed ~15 km by the API before
 * they ever reach the browser.
 */
export function ObservatoryMap({
  regions,
  readers = [],
  mode = "heat",
  height = 560,
  interactive = true,
  selected = null,
  onSelect,
  topBooks = [],
  initialView = null,
  overlayStats = null,
  focusOnVisitor = false,
  navigateOnSelect = false,
}: {
  regions: RegionStat[];
  readers?: MapReader[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks?: TopBook[];
  initialView?: MapView | null;
  overlayStats?: { readers: number; regions: number } | null;
  /** Fly to the visitor's own fuzzed area (else their IP-country region) on load. */
  focusOnVisitor?: boolean;
  /** On embedded maps, send region clicks to the full map workflow. */
  navigateOnSelect?: boolean;
}) {
  const [activeReader, setActiveReader] = useState<MapReader | null>(null);
  const personas = useMemo(() => readers.slice(0, MAX_PERSONAS), [readers]);
  const personaList = useMemo(() => personas.slice(0, MAX_PERSONA_LIST), [personas]);

  const { containerRef, ready, reset, zoomIn, zoomOut } = useCurioMap({
    interactive,
    initialView,
    regions,
    readers: personas,
    mode,
    selected,
    activeReaderId: activeReader?.user.id ?? null,
    focusOnVisitor,
    onSelect,
    navigateOnSelect,
    onPickReader: setActiveReader,
  });

  return (
    <div
      className={cn("map-dark-frame relative", height <= 0 && "map-fullbleed")}
      style={height > 0 ? { height } : undefined}
    >
      {/* Leaflet viewport. `isolate` gives the map its own stacking context so
          the DOM overlays below never render underneath Leaflet's panes. */}
      <div
        ref={containerRef}
        className="isolate z-0 h-full w-full"
        aria-label="World map of readers. Drag to pan, scroll or pinch to zoom, arrow keys to move, plus and minus to zoom. Coordinates are fuzzed to a roughly 15 kilometre grid."
      />

      {!ready ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-stage/70">
          <p className="text-xs text-ink-faint">lighting up the map…</p>
        </div>
      ) : null}

      {/* Bottom control bar. Anchored left so it never covers the OpenStreetMap
          attribution, which the tile policy requires to stay visible. */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-line bg-stage/85 px-3 py-1.5 backdrop-blur-md">
        <button
          type="button"
          aria-label="Reset world view"
          onClick={reset}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-line text-ink-faint transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RotateCcw size={14} />
        </button>
        <span className="h-4 w-px bg-line-2" />
        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-line text-ink-faint transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-line text-ink-faint transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Minus size={15} />
        </button>
        <span className="hidden h-4 w-px bg-line-2 sm:block" />
        <span className="hidden text-[10px] font-medium text-ink-faint sm:block">
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
                    className="persona-chip shrink-0 cursor-pointer rounded-full border border-line bg-white/5 py-1.5 pl-1.5 pr-3 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
        <div className="pointer-events-none absolute inset-x-3 bottom-32 z-20 mx-auto max-w-2xl">
          <div className="no-scrollbar pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-2xl border border-line bg-stage/85 px-4 py-3 backdrop-blur-md">
            <div className="flex shrink-0 items-center gap-1.5 pr-2">
              <span className="h-2 w-2 rounded-full bg-heat-hot animate-ping" />
              <span className="text-xs font-bold text-ink-muted">TRENDING</span>
            </div>
            {topBooks.slice(0, 7).map((b) => (
              <Link
                key={b.id}
                href={`/books/${b.id}`}
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-stage/80 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

/**
 * Region tooltip content. Built with `textContent` rather than an HTML string:
 * country/region/book titles come from the API, and Leaflet tooltips would
 * otherwise accept them as markup.
 */
function regionTooltip(region: RegionStat): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "curio-map-tip";

  const head = document.createElement("p");
  head.className = "curio-map-tip-head";
  head.textContent = regionPlace(region) || region.country;
  wrap.append(head);

  const count = document.createElement("p");
  count.textContent = `${region.activeReaders} readers reading now`;
  wrap.append(count);

  if (region.topBooks.length > 0) {
    const top = document.createElement("p");
    top.className = "curio-map-tip-top";
    top.textContent = `Top: ${region.topBooks
      .slice(0, 2)
      .map((book) => book.title)
      .join(" · ")}`;
    wrap.append(top);
  }

  const note = document.createElement("p");
  note.className = "curio-map-tip-note";
  note.textContent = "Fuzzed region, approximately 15 km";
  wrap.append(note);

  return wrap;
}

/**
 * Active-reader popover: who this persona is (privacy-safe display name), where
 * they are at fuzzed granularity, and what they are reading right now, with a
 * direct path to their public shelf. Escape closes; the map keeps its focus.
 */
function PersonaPopover({ reader, onClose }: { reader: MapReader; onClose: () => void }) {
  const place = readerPlace(reader);
  const books = reader.books.slice(0, 3);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={`${reader.user.displayName} is reading now`}
      className="rounded-2xl border border-line bg-stage/90 p-3.5 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start gap-2.5">
        <PersonaGlyph reader={reader} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{reader.user.displayName}</p>
          <p className="truncate text-[11px] text-ink-muted">
            {place || "Somewhere curious"}
            {reader.user.isAuthor ? " · author" : ""}
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Close reader popover"
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-ink-faint transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
        <BookOpen size={11} className="text-accent" />
        Reading now · <CountUp value={reader.books.length} className="text-ink" />
      </p>

      {books.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                href={`/books/${book.id}`}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] p-2 transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <BookCover book={book} size={30} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-ink">{book.title}</span>
                  <span className="block truncate text-[10px] text-ink-muted">{book.author}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-xl border border-line bg-white/[0.03] p-2 text-[11px] text-ink-muted">
          This shelf is private or between books right now.
        </p>
      )}

      <Link
        href={`/users/${reader.user.id}`}
        className="mt-3 flex cursor-pointer items-center justify-center rounded-full border border-line bg-white/5 py-2.5 text-xs font-bold text-ink transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        View public shelf
      </Link>
    </div>
  );
}
