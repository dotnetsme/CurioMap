"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookMarked,
  Globe2,
  MapPin,
  MessagesSquare,
  Orbit,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { CuriosityMapShell } from "@/components/discover/CuriosityMapShell";
import { NearbyReadersList } from "@/components/discover/NearbyReadersList";
import { DashboardPanel } from "@/components/home/DashboardPanel";
import { DiscussionPanel } from "@/components/home/DiscussionPanel";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { HomeStatsStrip } from "@/components/home/HomeStatsStrip";
import { ShelfGlance } from "@/components/home/ShelfGlance";
import { TrendingPanel } from "@/components/home/TrendingPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { StreakCard } from "@/components/profile/StreakCard";
import { ErrorState } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { globalDiscovery, nearby, stats, topics } from "@/lib/api/discover";
import type { GlobalDiscovery, Nearby, StatsSummary, TopicStat } from "@/types";

const FALLBACK_VECTORS = [
  "Philosophy",
  "Psychology",
  "Science & Nature",
  "History & Society",
  "Technology",
  "Sci-Fi",
  "Speculative & Magical",
  "Literary Fiction",
];

/**
 * The signed-in dashboard body. Rendered only behind <AuthGate>, so every call
 * below is authorised by construction.
 */
export function HomeDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [map, setMap] = useState<GlobalDiscovery | null>(null);
  const [near, setNear] = useState<Nearby | null>(null);
  const [topicList, setTopicList] = useState<TopicStat[]>([]);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Each call degrades on its own: a hidden location or a cold cache must
      // never blank the whole dashboard.
      const [s, g, n, t] = await Promise.all([
        stats().catch(() => null),
        globalDiscovery().catch(() => null),
        nearby().catch(() => null),
        topics().catch(() => []),
      ]);
      if (cancelled) return;
      setSummary(s);
      setMap(g);
      setNear(n);
      setTopicList(t);
      setSettled(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const unreachable = settled && !summary && !map;
  const displayVectors = topicList.length > 0
    ? topicList.map((t) => ({ name: t.topic, count: t.readerCount }))
    : FALLBACK_VECTORS.map((v) => ({ name: v, count: null }));

  return (
    <div className="mx-auto max-w-[1280px] py-2 sm:py-4">
      <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <Sparkles size={12} /> Home
          </p>
          <h1 className="mt-2 max-w-2xl display text-4xl text-ink-strong sm:text-5xl">
            Welcome back, {user.displayName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your shelf, your city, and what curious minds are reading right now.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link href="/me" className="btn-ghost min-h-11 px-3 text-sm">
            My profile
          </Link>
          <Link
            href="/discover/global"
            className="btn-ghost min-h-11 px-3 text-sm"
          >
            <Globe2 size={15} /> Open the map
          </Link>
          <Link
            href="/circles"
            className="btn-accent col-span-2 min-h-11 text-sm sm:col-span-1"
          >
            <MessagesSquare size={15} /> Start a discussion
          </Link>
        </div>
      </header>

      {unreachable ? (
        <ErrorState message="CurioMap couldn't load your dashboard — the API may be unreachable. Refresh to retry." />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <section className="card overflow-hidden">
            <div className="relative h-[320px] border-b border-line sm:h-[410px]">
              <CuriosityMapShell
                regions={map?.regions ?? []}
                height={0}
                focusOnVisitor
              />
              <div className="pointer-events-none absolute inset-x-3 bottom-4 z-[500] sm:right-28">
                <div className="pointer-events-auto">
                  <HomeSearchBar />
                </div>
              </div>
            </div>
            <div className="bg-stage-2/60 px-3 py-3 sm:px-4">
              <HomeStatsStrip stats={summary} />
            </div>
          </section>
        </Reveal>

        <div className="flex flex-col gap-6">
          <StreakCard />
        </div>
      </div>

      {/* Curiosity Vectors Pulse */}
      <Reveal>
        <section className="mt-6 card p-5 sm:p-6 ">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <Orbit size={13} /> Curiosity Vectors
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-ink">
                What readers are exploring worldwide
              </h2>
            </div>
            <Link
              href="/discover/global"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong transition"
            >
              Thematic map →
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {displayVectors.map((v) => (
              <Link
                key={v.name}
                href={`/discover/global?topic=${encodeURIComponent(v.name)}`}
                className="chip min-h-11 px-3.5 py-2 text-xs sm:text-sm"
              >
                <Sparkles size={13} className="text-accent" />
                <span className="font-medium">{v.name}</span>
                {v.count ? (
                  <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-semibold text-accent">
                    {v.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DashboardPanel
          icon={BookMarked}
          title="My bookshelf"
          hint="Private rows stay private — only you see them"
          action={
            <Link
              href="/me/bookshelf"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              Full shelf →
            </Link>
          }
        >
          <ShelfGlance />
        </DashboardPanel>

        <DashboardPanel
          icon={MapPin}
          title="Nearby readers"
          hint={
            near
              ? `${near.readers.length} matched at ${near.scope} level`
              : "Coarse location only"
          }
          action={
            <Link
              href="/discover/nearby"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              See all →
            </Link>
          }
        >
          {near ? (
            <NearbyReadersList
              scope={near.scope}
              readers={near.readers}
              compact
              limit={5}
            />
          ) : (
            <p className="text-sm leading-relaxed text-ink-muted">
              {settled
                ? "Nobody to show yet — your location may be hidden, or your area is still quiet."
                : "Looking for readers near you…"}{" "}
              <Link
                href="/me/settings"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Location privacy
              </Link>
            </p>
          )}
        </DashboardPanel>

        <DashboardPanel
          icon={MessagesSquare}
          title="Book discussion"
          hint="From readers you follow"
          action={
            <Link
              href="/circles"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              Circles →
            </Link>
          }
        >
          <DiscussionPanel />
        </DashboardPanel>
      </div>

      <div className="mt-6">
        <DashboardPanel
          icon={TrendingUp}
          title="Trending books"
          hint="What readers are shelving worldwide"
          action={
            <Link
              href="/discover/top-books"
              className="text-sm font-medium text-accent hover:text-accent-strong"
            >
              All →
            </Link>
          }
        >
          <TrendingPanel books={summary?.topBooks ?? []} loading={!settled} />
        </DashboardPanel>
      </div>
    </div>
  );
}
