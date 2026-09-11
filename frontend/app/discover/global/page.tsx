"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, MapPin, Search } from "lucide-react";
import { CuriosityMapShell } from "@/components/discover/CuriosityMapShell";
import type { MapMode } from "@/components/discover/CuriosityMap";
import { TopReadersStrip } from "@/components/discover/TopReadersStrip";
import { BookCover } from "@/components/books/BookCover";
import { ErrorState } from "@/components/ui/Feedback";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Skeleton } from "@/components/ui/Skeleton";
import { globalDiscovery } from "@/lib/api/discover";
import type { GlobalDiscovery, RegionStat } from "@/types";
import { cn } from "@/lib/utils";

export default function GlobalMapPage() {
  const [data, setData] = useState<GlobalDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("heat");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RegionStat | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await globalDiscovery();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the map");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.regions;
    return data.regions.filter((r) =>
      `${r.region} ${r.country}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  if (error) return <ErrorState message={error} />;
  if (!data) {
    return (
      <div className="flex flex-col gap-6 py-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[440px] w-full" />
      </div>
    );
  }

  const active = selected ?? filtered[0] ?? null;

  return (
    <div className="flex flex-col gap-8 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-sm text-accent-strong">Live heatmap</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            The curiosity map
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
            A live heatmap of active readers — aggregated to regions, fuzzed to ~15 km, never pinpointed.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-xs font-semibold">
          {(
            [
              { key: "heat", label: "Heat" },
              { key: "bubbles", label: "Bubbles" },
            ] as { key: MapMode; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 transition",
                mode === t.key ? "bg-ink text-surface shadow" : "text-ink-3 hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <CuriosityMapShell regions={filtered} mode={mode} height={520} selected={selected} onSelect={setSelected} />
        <aside className="flex min-h-0 flex-col gap-3">
          <label className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm focus-within:border-accent">
            <Search size={15} className="shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search regions or countries…"
              className="w-full bg-transparent outline-none placeholder:text-ink-3"
            />
          </label>
          <div className="card flex max-h-[300px] flex-col overflow-hidden p-2 lg:max-h-none lg:flex-1">
            <p className="label-sm px-3 pb-1 pt-2 text-ink-faint">
              {filtered.length} region{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.slice(0, 60).map((r, i) => {
                const isActive =
                  !!active && active.country === r.country && active.region === r.region;
                return (
                  <button
                    key={`${r.country}-${r.region}-${i}`}
                    onClick={() => setSelected(r)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      isActive ? "bg-accent-soft" : "hover:bg-surface-2",
                    )}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", isActive ? "bg-ink text-amber-300" : "bg-surface-2 text-ink-3")}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {r.region ? `${r.region}, ` : ""}{r.country}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                        <Flame size={11} /> {r.activeReaders} reading
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-faint">No regions match.</p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {active ? (
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <MapPin size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-ink">
                {active.region ? `${active.region}, ` : ""}{active.country}
              </p>
              <p className="text-xs text-ink-faint">
                {active.activeReaders} active readers · fuzzed ~15 km ·{" "}
                <Link href="/policy/privacy" className="underline hover:text-ink">privacy</Link>
              </p>
            </div>
          </div>
          {active.topBooks.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {active.topBooks.slice(0, 3).map((b) => (
                  <Link key={b.id} href={`/books/${b.id}`} className="rounded-md ring-2 ring-surface transition hover:-translate-y-1">
                    <BookCover book={b} size={36} />
                  </Link>
                ))}
              </div>
              <div className="text-xs text-ink-faint">
                Hot here:{" "}
                <Link href={`/books/${active.topBooks[0].id}`} className="font-semibold text-ink hover:text-accent">
                  {active.topBooks[0].title}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="flex flex-col gap-5">
        <SectionHeading
          eyebrow="Leaderboard"
          title="Most active regions"
          hint="Where curiosity burns brightest this week."
        />
        <TopReadersStrip regions={data.regions} />
      </section>
    </div>
  );
}