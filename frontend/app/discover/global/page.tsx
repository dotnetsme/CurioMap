"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Flame, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { CuriosityMapShell } from "@/components/discover/CuriosityMapShell";
import { ObservatoryLegend } from "@/components/discover/ObservatoryMap";
import type { MapMode } from "@/components/discover/ObservatoryMap";
import { NearbyReadersList } from "@/components/discover/NearbyReadersList";
import { BookCover } from "@/components/books/BookCover";
import { ErrorState } from "@/components/ui/Feedback";
import { globalDiscovery, stats, nearby, mapReaders } from "@/lib/api/discover";
import { useAuth } from "@/components/providers/AuthProvider";
import type {
  GlobalDiscovery,
  MapReader,
  RegionStat,
  StatsSummary,
  Nearby,
  NearbyReader,
} from "@/types";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/CountUp";

export default function GlobalMapPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<GlobalDiscovery | null>(null);
  const [statsData, setStatsData] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("heat");
  const [selected, setSelected] = useState<RegionStat | null>(null);
  const [personas, setPersonas] = useState<MapReader[]>([]);
  const [nearbyReaders, setNearbyReaders] = useState<NearbyReader[]>([]);
  const [nearbyScope, setNearbyScope] = useState<Nearby["scope"] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyRetryCount, setNearbyRetryCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await globalDiscovery();
        const sum = await stats().catch(() => null);
        const readers = await mapReaders(undefined, undefined, 50).catch(() => null);
        if (!cancelled) {
          setData(result);
          setStatsData(sum);
          setPersonas(readers?.readers ?? []);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load the map");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams(window.location.search);
    const country = params.get("country");
    if (!country) return;
    const region = params.get("region") ?? "";
    const requested = data.regions.find(
      (candidate) =>
        candidate.country === country && candidate.region === region,
    );
    if (requested) setSelected(requested);
  }, [data]);

  useEffect(() => {
    if (!user?.id || authLoading) return;
    let cancelled = false;
    (async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      try {
        const near = await nearby();
        if (!cancelled && near) {
          setNearbyReaders(near.readers);
          setNearbyScope(near.scope);
        }
      } catch (e) {
        if (!cancelled) {
          setNearbyError(
            e instanceof Error ? e.message : "Failed to load nearby readers",
          );
          setNearbyReaders([]);
          setNearbyScope(null);
        }
      } finally {
        if (!cancelled) setNearbyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, nearbyRetryCount]);

  const activeRegion = useMemo(() => {
    if (!data) return null;
    if (selected) return selected;
    const localLocation = user?.location;
    const localRegion = data.regions.find(
      (region) =>
        region.country === localLocation?.country &&
        (localLocation.region === null ||
          region.region === localLocation.region),
    );
    if (localRegion) return localRegion;
    return data.regions[0] ?? null;
  }, [data, selected, user?.location]);

  const handleToggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  if (error) return <ErrorState message={error} />;
  if (!data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stage">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
            <div className="absolute inset-2 h-12 w-12 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
            <div className="absolute inset-4 h-8 w-8 rounded-full bg-accent/40" />
          </div>
          <p className="text-sm text-ink-muted">
            Lighting up the curiosity map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-stage overflow-hidden">
      <CuriosityMapShell
        regions={data.regions}
        readers={personas}
        mode={mode}
        interactive={true}
        selected={selected}
        onSelect={setSelected}
        overlayStats={
          statsData
            ? { readers: statsData.readers, regions: statsData.activeRegions }
            : null
        }
        focusOnVisitor={true}
        height={0}
      />

      {/* Hero Overlay */}
      <header className="pointer-events-none absolute top-0 left-0 right-0 z-[500]">
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-line bg-stage/75 px-3 py-1.5 backdrop-blur-md">
              <div className="relative h-4 w-4">
                <span className="absolute h-full w-full rounded-full bg-signal/40 animate-ping" />
                <span className="absolute inset-0.5 h-3 w-3 rounded-full bg-signal" />
              </div>
              <span className="text-xs font-bold tracking-wide text-ink-strong">
                CurioMap
              </span>
            </div>
          </div>

          {statsData && (
            <div className="pointer-events-auto hidden sm:flex items-center gap-3 rounded-full border border-line bg-stage/70 px-3.5 py-1.5 backdrop-blur-md">
              <StatPill
                icon={<Users size={13} />}
                value={statsData.readers}
                label="readers"
              />
              <span className="h-3 w-px bg-white/10" />
              <StatPill
                icon={<BookOpen size={13} />}
                value={statsData.books}
                label="books"
              />
              <span className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full rounded-full bg-signal animate-ping" />
                  <span className="h-2 w-2 rounded-full bg-signal" />
                </span>
                <span className="text-xs font-semibold text-signal">
                  <CountUp
                    value={data.regions.reduce(
                      (s, r) => s + r.activeReaders,
                      0,
                    )}
                  />
                </span>
                <span className="text-xs text-ink-muted">reading now</span>
              </div>
            </div>
          )}

          <button
            onClick={handleToggleSidebar}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-stage/75 px-3 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur-md transition hover:border-accent hover:text-ink"
          >
            {sidebarOpen ? <X size={14} /> : <Sparkles size={14} />}
            <span className="hidden sm:inline">
              {sidebarOpen ? "Close" : "Activity"}
            </span>
          </button>
        </div>
      </header>

      {/* Selected region panel */}
      {activeRegion && (
        <aside className="absolute left-0 top-14 bottom-0 z-[500] w-full max-w-xs pointer-events-none">
          <div className="p-4">
            <section className="pointer-events-auto rounded-2xl border border-line bg-stage/85 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-signal">
                <TrendingUp size={12} />
                <span>HOT RIGHT NOW</span>
              </div>
              <p className="mt-1 text-lg font-bold text-ink-strong">
                {activeRegion.region ? `${activeRegion.region}, ` : ""}
                {activeRegion.country}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {activeRegion.activeReaders} readers active
              </p>
              {activeRegion.topBooks.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {activeRegion.topBooks.slice(0, 3).map((b) => (
                      <Link
                        key={b.id}
                        href={`/books/${b.id}`}
                        className="rounded-md ring-2 ring-stage/85 transition hover:-translate-y-1 hover:ring-accent/50"
                      >
                        <BookCover book={b} size={32} />
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-ink-faint">
                    <span className="font-semibold text-ink-muted">
                      {activeRegion.topBooks[0].title}
                    </span>{" "}
                    trending
                  </p>
                </div>
              )}
            </section>
          </div>
        </aside>
      )}

      {/* Activity Sidebar */}
      <aside
        className={cn(
          "absolute top-12 right-0 bottom-0 z-[500] w-full max-w-xs transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="no-scrollbar flex h-full flex-col gap-4 overflow-y-auto p-4 pb-28">
          <section className="rounded-2xl border border-line bg-stage/85 p-4 backdrop-blur-md">
            <p className="text-xs font-semibold text-ink-muted">MAP LAYER</p>
            <div className="mt-2 flex gap-2">
              {(["heat", "bubbles", "dark"] as MapMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition",
                    mode === m
                      ? "bg-accent text-accent-ink"
                      : "bg-white/5 text-ink-muted hover:bg-white/10",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <ObservatoryLegend />
            </div>
          </section>

          {user && (
            <section className="rounded-2xl border border-line bg-stage/85 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-muted">
                  READERS NEAR YOU
                </p>
                {nearbyScope && (
                  <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal">
                    {nearbyScope}
                  </span>
                )}
              </div>
              {nearbyLoading ? (
                <div className="mt-3 flex flex-col gap-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-lg bg-white/5"
                    />
                  ))}
                </div>
              ) : nearbyError ? (
                <div className="mt-3">
                  <p className="text-xs text-ink-faint">{nearbyError}</p>
                  <button
                    onClick={() => setNearbyRetryCount((c) => c + 1)}
                    className="mt-2 text-xs font-semibold text-accent underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              ) : nearbyScope ? (
                <div className="mt-3">
                  <NearbyReadersList
                    scope={nearbyScope}
                    readers={nearbyReaders}
                  />
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-faint">
                  Set your location in{" "}
                  <Link
                    href="/me/settings"
                    className="font-semibold text-accent underline underline-offset-2"
                  >
                    Settings
                  </Link>{" "}
                  to see nearby readers.
                </p>
              )}
            </section>
          )}

          {activeRegion && activeRegion.topBooks.length > 0 && (
            <section className="rounded-2xl border border-line bg-stage/85 p-4 backdrop-blur-md">
              <p className="text-xs font-semibold text-ink-muted">
                TOP BOOKS HERE
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {activeRegion.topBooks.slice(0, 5).map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/books/${b.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-accent/10"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <BookCover book={b} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-strong">
                        {b.title}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {b.author}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-stage/85 p-4 backdrop-blur-md">
            <p className="text-xs font-semibold text-ink-muted">
              MOST ACTIVE REGIONS
            </p>
            <div className="mt-3 flex flex-col gap-1">
              {data.regions.slice(0, 8).map((r, i) => (
                <button
                  key={`${r.country}-${r.region}-${i}`}
                  onClick={() => setSelected(r)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-left transition",
                    selected?.country === r.country &&
                      selected?.region === r.region
                      ? "bg-accent/20 text-ink-strong"
                      : "text-ink-muted hover:bg-white/5 hover:text-ink-strong",
                  )}
                >
                  <span className="truncate text-sm">
                    {r.region ? `${r.region}, ` : ""}
                    {r.country}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-signal">
                    {r.activeReaders}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* Bottom Bar */}
      {activeRegion && activeRegion.topBooks.length > 0 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[500] p-4 sm:p-6">
          <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto rounded-2xl border border-line bg-stage/85 px-4 py-3 backdrop-blur-md">
            <div className="flex shrink-0 items-center gap-1.5 pr-2">
              <Flame size={14} className="text-heat-hot" />
              <span className="text-xs font-bold text-ink-muted">
                TRENDING
              </span>
            </div>
            {activeRegion.topBooks.slice(0, 7).map((b) => (
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
      )}
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-signal">{icon}</span>
      <span className="text-sm font-bold text-ink-strong">
        <CountUp value={value} />
      </span>
      <span className="text-xs text-ink-faint">{label}</span>
    </div>
  );
}
