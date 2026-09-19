"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  LogIn,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { AuthUser, MapReader, RegionStat, TopBook } from "@/types";
import { isoCountryName } from "@/lib/country-names";
import { useAuth } from "@/components/providers/AuthProvider";
import { mapReaders } from "@/lib/api/discover";
import { ipCountry } from "@/lib/api/users";
import { Avatar } from "@/components/profile/Avatar";
import { BookCover } from "@/components/books/BookCover";
import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

export type MapMode = "heat" | "bubbles" | "dark";

const MAX_READER_MARKERS = 120;
const MAX_READER_LIST = 50;
const MAP_WORLD_CENTER: [number, number] = [20, 0];
const MAP_MIN_ZOOM = 2;
const MAP_MAX_ZOOM = 10;
const MAP_SELECTION_ZOOM = 9;
const MAX_HEATMAP_RADIUS_METERS = 15000;

function clampHeatmapRadius(intensity: number, zoom: number) {
  const safeZoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, zoom));
  const base = 6000 + intensity * MAX_HEATMAP_RADIUS_METERS;
  const cap = MAX_HEATMAP_RADIUS_METERS * (safeZoom >= 6 ? 0.8 : 1);
  return Math.min(cap, Math.max(5000, base));
}

function MapViewportTracker({
  onChange,
}: {
  onChange: (bounds: L.LatLngBounds | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const update = () => onChange(map.getBounds());
    update();
    map.on("moveend zoomend", update);
    return () => {
      map.off("moveend zoomend", update);
    };
  }, [map, onChange]);

  return null;
}

function MapInteractionGuard({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
    moveend() {
      onZoomChange(map.getZoom());
    },
  });

  return null;
}

function MapCenterSync({
  center,
  local,
}: {
  center: [number, number];
  local: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, local ? Math.max(map.getZoom(), 5) : MAP_MIN_ZOOM, {
      animate: false,
    });
  }, [center, local, map]);

  return null;
}

function MapSelectionSync({ selected }: { selected: RegionStat | null }) {
  const map = useMap();

  useEffect(() => {
    if (
      selected?.lat === null ||
      selected?.lat === undefined ||
      selected.lng === null ||
      selected.lng === undefined
    ) {
      return;
    }
    map.setView([selected.lat, selected.lng], MAP_SELECTION_ZOOM, {
      animate: true,
      duration: 0.7,
    });
  }, [map, selected]);

  return null;
}

export function CuriosityMap({
  regions,
  mode = "heat",
  height = 520,
  interactive = true,
  selected = null,
  onSelect,
  topBooks = [],
  focusOnVisitor = false,
  navigateOnSelect = false,
}: {
  regions: RegionStat[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks?: TopBook[];
  focusOnVisitor?: boolean;
  navigateOnSelect?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [spotlight, setSpotlight] = useState<TopBook | null>(null);
  const [readers, setReaders] = useState<MapReader[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [visitorCountry, setVisitorCountry] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MAP_MIN_ZOOM);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedReader, setSelectedReader] = useState<MapReader | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!focusOnVisitor) return;
    let cancelled = false;
    ipCountry()
      .then((r) => {
        if (!cancelled && r.country) setVisitorCountry(r.country);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [focusOnVisitor]);

  const max = useMemo(
    () => Math.max(1, ...regions.map((r) => r.activeReaders)),
    [regions],
  );
  const total = useMemo(
    () => regions.reduce((s, r) => s + r.activeReaders, 0),
    [regions],
  );

  const refresh = useCallback(
    async (country?: string | null, region?: string | null) => {
      setLoadingReaders(true);
      try {
        const res = await mapReaders(
          country ?? undefined,
          region ?? undefined,
          50,
        );
        setReaders(res.readers.slice(0, MAX_READER_MARKERS));
      } catch {
        setReaders([]);
      } finally {
        setLoadingReaders(false);
      }
    },
    [],
  );

  const handleRegionSelect = useCallback(
    (region: RegionStat | null) => {
      if (navigateOnSelect && region) {
        const params = new URLSearchParams({ country: region.country });
        if (region.region) params.set("region", region.region);
        router.push(`/discover/global?${params.toString()}`);
        return;
      }
      onSelect?.(region);
    },
    [navigateOnSelect, onSelect, router],
  );

  useEffect(() => {
    if (!interactive) return;
    setSelectedReader(null);
    void refresh(
      selected?.country ?? user?.location?.country ?? visitorCountry,
      selected?.region ?? user?.location?.region,
    );
  }, [
    interactive,
    refresh,
    selected?.country,
    selected?.region,
    user?.location?.country,
    user?.location?.region,
    visitorCountry,
  ]);

  const visibleRegions = useMemo(() => {
    if (!bounds) return regions.filter((r) => r.lat !== null && r.lng !== null);

    return regions.filter((r) => {
      if (r.lat === null || r.lng === null) return false;
      return bounds.contains(L.latLng(r.lat, r.lng));
    });
  }, [bounds, regions]);

  const heatmapRegions = useMemo(
    () =>
      visibleRegions
        .filter((r) => r.lat !== null && r.lng !== null)
        .map((r) => ({ region: r, lat: r.lat!, lng: r.lng! })),
    [visibleRegions],
  );

  const localView = useMemo<{
    center: [number, number];
    local: boolean;
  }>(() => {
    const ownLocation = user?.location;
    if (
      ownLocation?.latFuzzed !== null &&
      ownLocation?.lngFuzzed !== null &&
      ownLocation?.latFuzzed !== undefined &&
      ownLocation?.lngFuzzed !== undefined
    ) {
      return {
        center: [ownLocation.latFuzzed, ownLocation.lngFuzzed],
        local: true,
      };
    }

    const visitorRegion = regions.find(
      (region) =>
        region.country === visitorCountry &&
        region.lat !== null &&
        region.lng !== null,
    );
    if (
      visitorRegion?.lat !== null &&
      visitorRegion?.lng !== null &&
      visitorRegion?.lat !== undefined &&
      visitorRegion?.lng !== undefined
    ) {
      return { center: [visitorRegion.lat, visitorRegion.lng], local: true };
    }

    return { center: MAP_WORLD_CENTER, local: false };
  }, [regions, user?.location, visitorCountry]);

  const dark = mode === "dark";
  if (!mounted) {
    return (
      <div
        className={cn(
          "map-dark-frame flex items-center justify-center",
          height <= 0 && "map-fullbleed",
        )}
        style={height > 0 ? { height } : undefined}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-300/20 border-t-amber-300" />
          <p className="text-xs text-amber-200/60">lighting up the map…</p>
        </div>
      </div>
    );
  }

  return (
    <MapSvg
      regions={heatmapRegions}
      readers={readers}
      loading={loadingReaders}
      max={max}
      total={total}
      mode={mode}
      dark={dark}
      height={height}
      interactive={interactive}
      selected={selected}
      onSelect={handleRegionSelect}
      topBooks={topBooks}
      spotlight={spotlight}
      setSpotlight={setSpotlight}
      user={user}
      center={localView.center}
      local={localView.local}
      zoom={zoom}
      onZoomChange={setZoom}
      onBoundsChange={setBounds}
      selectedReader={selectedReader}
      onSelectReader={setSelectedReader}
    />
  );
}

type Bubble = { region: RegionStat; lat: number; lng: number };

function MapSvg(props: {
  regions: Bubble[];
  readers: MapReader[];
  loading: boolean;
  max: number;
  total: number;
  mode: MapMode;
  dark: boolean;
  height: number;
  interactive: boolean;
  selected: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks: TopBook[];
  spotlight: TopBook | null;
  setSpotlight: (b: TopBook | null) => void;
  user: AuthUser | null;
  center: [number, number];
  local: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds | null) => void;
  selectedReader: MapReader | null;
  onSelectReader: (reader: MapReader | null) => void;
}) {
  const { regions, max, total, mode, zoom } = props;
  return (
    <div
      className={cn(
        "map-dark-frame relative",
        props.height <= 0 && "map-fullbleed",
      )}
    >
      <MapContainer
        center={MAP_WORLD_CENTER}
        zoom={MAP_MIN_ZOOM}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        scrollWheelZoom={props.interactive}
        dragging={props.interactive}
        doubleClickZoom={props.interactive}
        zoomControl={props.interactive}
        style={
          props.height > 0
            ? { height: props.height, width: "100%" }
            : { height: "100%", width: "100%" }
        }
        className={cn("z-0 w-full", props.height <= 0 && "h-full")}
        aria-label="Global curiosity heatmap"
      >
        <MapCenterSync center={props.center} local={props.local} />
        <MapSelectionSync selected={props.selected} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportTracker onChange={props.onBoundsChange} />
        <MapInteractionGuard onZoomChange={props.onZoomChange} />

        {regions.map(({ region: r, lat, lng }, i) => {
          const intensity = r.activeReaders / max;
          const radius = clampHeatmapRadius(intensity, zoom);
          const isSelected =
            props.selected?.country === r.country &&
            props.selected?.region === r.region;
          const fillColor = mode === "dark" ? "#9a3412" : "#c2410c";
          const opacity = Math.min(0.9, 0.25 + intensity * 0.7);

          return (
            <Circle
              key={`${r.country}-${r.region}-${i}`}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? "#fef3c7" : fillColor,
                fillColor,
                fillOpacity: opacity,
                weight: isSelected ? 2.5 : 1.3,
                opacity: 0.75,
                className: cn(
                  "curio-heat-pulse",
                  isSelected && "curio-heat-selected",
                ),
              }}
              eventHandlers={{
                click: () => props.onSelect?.(isSelected ? null : r),
              }}
            >
              <Tooltip sticky direction="top" opacity={0.96}>
                <div className="min-w-44 text-xs">
                  <p className="font-semibold">
                    {r.region ? `${r.region}, ` : ""}
                    {isoCountryName(r.country) ?? r.country}
                  </p>
                  <p>{r.activeReaders} readers reading now</p>
                  {r.topBooks.length > 0 ? (
                    <p className="mt-1 text-[11px]">
                      Top:{" "}
                      {r.topBooks
                        .slice(0, 2)
                        .map((book) => book.title)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-slate-500">
                    Fuzzed region, approximately 15 km
                  </p>
                </div>
              </Tooltip>
            </Circle>
          );
        })}
      </MapContainer>

      <MapOverlays {...props} total={total} />
    </div>
  );
}

function MapOverlays(props: {
  readers: MapReader[];
  loading: boolean;
  total: number;
  interactive: boolean;
  selected: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks: TopBook[];
  spotlight: TopBook | null;
  setSpotlight: (b: TopBook | null) => void;
  user: { id: string } | null;
  selectedReader: MapReader | null;
  onSelectReader: (reader: MapReader | null) => void;
  height: number;
}) {
  const {
    readers,
    loading,
    total,
    interactive,
    selected,
    onSelect,
    topBooks,
    spotlight,
    setSpotlight,
    user,
    selectedReader,
    onSelectReader,
    height,
  } = props;
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full border border-amber-300/20 bg-night/80 py-1 pl-2 pr-3 text-[11px] text-amber-200/90 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        hover a glow · click for readers · fuzzed ~15 km
      </div>
      {interactive && topBooks.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] w-full max-w-[min(calc(100%-1.5rem),560px)]">
          <p className="label-sm mb-1.5 flex items-center gap-1.5 text-amber-200/75">
            <TrendingUp size={11} /> What&apos;s trending
          </p>
          <div className="no-scrollbar pointer-events-auto flex gap-1.5 overflow-x-auto pb-1">
            {topBooks.slice(0, 7).map((b) => {
              const active = spotlight?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() =>
                    active ? setSpotlight(null) : setSpotlight(b)
                  }
                  aria-pressed={active}
                  aria-label={`Spotlight ${b.title}`}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur transition focus-visible:ring-2 focus-visible:ring-amber-300",
                    active
                      ? "border-amber-300 bg-amber-400 text-night"
                      : "border-amber-300/25 bg-night/80 text-amber-100 hover:border-amber-300/60",
                  )}
                >
                  <BookOpen
                    size={12}
                    className={active ? "text-night" : "text-amber-300"}
                  />
                  <span className="max-w-[130px] truncate">{b.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] flex items-center gap-2 rounded-full border border-amber-300/25 bg-night/85 px-3.5 py-2 text-amber-100 backdrop-blur">
        <CountUp
          value={total}
          className="font-mono text-sm font-bold tabular-nums text-amber-200"
        />
        <span className="text-[11px] text-amber-200/70">reading now</span>
      </div>
      {selected ? (
        <div
          className={cn(
            "absolute z-[500] w-72 max-w-[calc(100%-1.5rem)] rounded-2xl border border-amber-300/20 bg-night/90 p-3 shadow-2xl backdrop-blur",
            height > 0
              ? "left-1/2 top-1/2 max-h-[calc(100%-7rem)] -translate-x-1/2 -translate-y-1/2"
              : "left-3 top-[13rem] max-h-[calc(100%-14rem)]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-100">
              {selectedReader ? (
                <button
                  type="button"
                  onClick={() => onSelectReader(null)}
                  className="mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-amber-200 hover:bg-white/20"
                  aria-label="Back to readers in this region"
                >
                  <ArrowLeft size={13} />
                </button>
              ) : (
                <MapPin size={13} className="text-amber-300" />
              )}
              {selectedReader
                ? selectedReader.user.displayName
                : `${selected.region ? `${selected.region}, ` : ""}${isoCountryName(selected.country) ?? selected.country}`}
            </p>
            <button
              onClick={() => onSelect?.(null)}
              aria-label="Close region panel"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/10 text-amber-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              ×
            </button>
          </div>
          <p
            className="mt-0.5 text-[11px] text-amber-200/70"
            role="status"
            aria-live="polite"
          >
            {selectedReader
              ? `${selectedReader.books.length} books currently reading`
              : loading
                ? "finding readers near here…"
                : `${readers.length} readers found · fuzzed ~15 km`}
          </p>
          {selectedReader ? (
            <div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/50">
                Currently reading
              </p>
              <ul className="mt-1.5 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                {selectedReader.books.map((book) => (
                  <li key={book.id}>
                    <Link
                      href={`/books/${book.id}/conversations`}
                      className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-2 transition hover:bg-amber-300/10"
                    >
                      <BookCover book={book} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-amber-100">
                          {book.title}
                        </span>
                        <span className="block truncate text-[11px] text-amber-200/60">
                          {book.author}
                        </span>
                      </span>
                      <BookOpen size={13} className="shrink-0 text-amber-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {readers.slice(0, MAX_READER_LIST).map((r) => (
                <li key={r.user.id}>
                  <button
                    type="button"
                    onClick={() => onSelectReader(r)}
                    className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition hover:bg-amber-300/10"
                  >
                    <Avatar
                      avatarId={r.user.avatarId}
                      name={r.user.displayName}
                      size={30}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-amber-100">
                        {r.user.displayName}
                      </span>
                      <span className="block text-[11px] text-amber-200/60">
                        {r.books.length}{" "}
                        {r.books.length === 1 ? "book" : "books"} currently
                        reading
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {readers.length === 0 && !loading ? (
                <li className="text-[11px] text-amber-200/60">
                  No public readers here yet.
                </li>
              ) : null}
            </ul>
          )}
          {!user ? (
            <Link
              href="/auth/register"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-[12.5px] font-bold text-night transition hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              <LogIn size={13} /> Join CurioMap
            </Link>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200/60">
              <Users size={12} /> Anonymous by default · handles stay hidden
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
