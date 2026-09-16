"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, LogIn, MapPin, TrendingUp, Users } from "lucide-react";
import type { MapReader, RegionStat, TopBook } from "@/types";
import { isoCountryName } from "@/lib/country-names";
import { useAuth } from "@/components/providers/AuthProvider";
import { mapReaders } from "@/lib/api/discover";
import { ipCountry } from "@/lib/api/users";
import { Avatar } from "@/components/profile/Avatar";
import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

export type MapMode = "heat" | "bubbles" | "dark";

const W = 1000;
const H = 500;
const MAX_READER_MARKERS = 120;
const MAX_READER_LIST = 50;

function project(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function CuriosityMap({
  regions,
  mode = "heat",
  height = 520,
  interactive = true,
  selected = null,
  onSelect,
  topBooks = [],
  focusOnVisitor = false,
}: {
  regions: RegionStat[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks?: TopBook[];
  focusOnVisitor?: boolean;
}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [spotlight, setSpotlight] = useState<TopBook | null>(null);
  const [readers, setReaders] = useState<MapReader[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [visitorCountry, setVisitorCountry] = useState<string | null>(null);

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

  const max = useMemo(() => Math.max(1, ...regions.map((r) => r.activeReaders)), [regions]);
  const total = useMemo(() => regions.reduce((s, r) => s + r.activeReaders, 0), [regions]);

  const refresh = useCallback(async (country?: string | null, region?: string | null) => {
    setLoadingReaders(true);
    try {
      const res = await mapReaders(country ?? undefined, region ?? undefined, 50);
      setReaders(res.readers.slice(0, MAX_READER_MARKERS));
    } catch {
      setReaders([]);
    } finally {
      setLoadingReaders(false);
    }
  }, []);

  useEffect(() => {
    if (!interactive) return;
    void refresh(selected?.country ?? visitorCountry, selected?.region);
  }, [interactive, refresh, selected?.country, selected?.region, visitorCountry]);

  const bubbles = useMemo(
    () =>
      regions
        .filter((r) => r.lat !== null && r.lng !== null)
        .map((r) => ({ region: r, x: project(r.lat!, r.lng!).x, y: project(r.lat!, r.lng!).y })),
    [regions],
  );

  const dots = useMemo(
    () =>
      readers
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        .slice(0, MAX_READER_MARKERS)
        .map((r) => ({ reader: r, ...project(r.lat, r.lng) })),
    [readers],
  );

  const dark = mode === "dark";
  if (!mounted) {
    return (
      <div
        className={cn("map-dark-frame flex items-center justify-center", height <= 0 && "map-fullbleed")}
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
      regions={bubbles}
      dots={dots}
      readers={readers}
      loading={loadingReaders}
      max={max}
      total={total}
      mode={mode}
      dark={dark}
      height={height}
      interactive={interactive}
      selected={selected}
      onSelect={onSelect}
      topBooks={topBooks}
      spotlight={spotlight}
      setSpotlight={setSpotlight}
      user={user}
    />
  );
}

type Bubble = { region: RegionStat; x: number; y: number };
type Dot = { reader: MapReader; x: number; y: number };

function MapSvg(props: {
  regions: Bubble[];
  dots: Dot[];
  // readers/loading are not consumed here, but must stay in the type: they are
  // forwarded wholesale to <MapOverlays {...props} />, which does use them.
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
  user: { id: string } | null;
}) {
  const { regions, dots, max, total, mode, dark } = props;
  return (
    <div className={cn("map-dark-frame relative", props.height <= 0 && "map-fullbleed")}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={props.height > 0 ? { height: props.height } : undefined}
        className={cn("z-0 w-full", props.height <= 0 && "h-full")}
        preserveAspectRatio={props.height <= 0 ? "xMidYMid slice" : undefined}
        role="img"
        aria-label="Global curiosity heatmap — select a region to meet readers"
      >
        <defs>
          <radialGradient id="curio-dot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill={dark ? "#0b1020" : "#fef3c7"} />
        {regions.map(({ region: r, x, y }, i) => {
          const intensity = r.activeReaders / max;
          const radius = 6 + intensity * (mode === "bubbles" ? 20 : 30);
          const isSelected = props.selected?.country === r.country && props.selected?.region === r.region;
          return (
            <g key={`${r.country}-${r.region}-${i}`}>
              <circle cx={x} cy={y} r={radius} fill="url(#curio-dot)">
                <title>{`${esc(r.country)} — ${r.activeReaders} readers`}</title>
              </circle>
              <circle cx={x} cy={y} r={2.5} fill="#fbbf24" fillOpacity={0.5 + intensity * 0.5} />
              {props.interactive ? (
                <circle
                  cx={x}
                  cy={y}
                  r={Math.max(radius, 14)}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => props.onSelect?.(isSelected ? null : r)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${r.region ? `${r.region}, ` : ""}${r.country}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") props.onSelect?.(isSelected ? null : r);
                  }}
                />
              ) : null}
              {isSelected ? (
                <circle cx={x} cy={y} r={radius + 4} fill="none" stroke="#fbbf24" strokeWidth={2} />
              ) : null}
            </g>
          );
        })}
        {dots.map(({ reader: r, x, y }) => (
          <circle key={r.user.id} cx={x} cy={y} r={3.2} fill="#34d399" stroke="#064e3b" strokeWidth={1}>
            <title>{`${esc(r.user.displayName)} — reading nearby`}</title>
          </circle>
        ))}
      </svg>
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
}) {
  const { readers, loading, total, interactive, selected, onSelect, topBooks, spotlight, setSpotlight, user } = props;
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full border border-amber-300/20 bg-night/80 py-1 pl-2 pr-3 text-[11px] text-amber-200/90 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        live · fuzzed ~15 km · select a region to meet readers
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
                  onClick={() => (active ? setSpotlight(null) : setSpotlight(b))}
                  aria-pressed={active}
                  aria-label={`Spotlight ${b.title}`}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur transition focus-visible:ring-2 focus-visible:ring-amber-300",
                    active
                      ? "border-amber-300 bg-amber-400 text-night"
                      : "border-amber-300/25 bg-night/80 text-amber-100 hover:border-amber-300/60",
                  )}
                >
                  <BookOpen size={12} className={active ? "text-night" : "text-amber-300"} />
                  <span className="max-w-[130px] truncate">{b.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] flex items-center gap-2 rounded-full border border-amber-300/25 bg-night/85 px-3.5 py-2 text-amber-100 backdrop-blur">
        <CountUp value={total} className="font-mono text-sm font-bold tabular-nums text-amber-200" />
        <span className="text-[11px] text-amber-200/70">reading now</span>
      </div>
      {selected ? (
        <div className="absolute right-3 top-14 z-[500] w-72 max-w-[calc(100%-1.5rem)] rounded-2xl border border-amber-300/20 bg-night/90 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-100">
              <MapPin size={13} className="text-amber-300" />
              {selected.region ? `${selected.region}, ` : ""}
              {isoCountryName(selected.country) ?? selected.country}
            </p>
            <button
              onClick={() => onSelect?.(null)}
              aria-label="Close region panel"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/10 text-amber-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              ×
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-amber-200/70" role="status" aria-live="polite">
            {loading ? "finding readers near here…" : `${readers.length} readers visible · fuzzed ~15 km`}
          </p>
          <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
            {readers.slice(0, MAX_READER_LIST).map((r) => (
              <li key={r.user.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
                <Avatar avatarId={r.user.avatarId} name={r.user.displayName} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-amber-100">{r.user.displayName}</p>
                  <p className="truncate text-[11px] text-amber-200/60">
                    {r.books.map((b) => b.title).slice(0, 2).join(" · ") || "reading now"}
                  </p>
                </div>
              </li>
            ))}
            {readers.length === 0 && !loading ? (
              <li className="text-[11px] text-amber-200/60">No public readers here yet.</li>
            ) : null}
          </ul>
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

