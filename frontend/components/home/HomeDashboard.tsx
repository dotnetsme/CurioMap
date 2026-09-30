"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookMarked,
  Globe2,
  MapPin,
  MessagesSquare,
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
import { globalDiscovery, nearby, stats } from "@/lib/api/discover";
import type { GlobalDiscovery, Nearby, StatsSummary } from "@/types";

/**
 * The signed-in dashboard body. Rendered only behind <AuthGate>, so every call
 * below is authorised by construction.
 */
export function HomeDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [map, setMap] = useState<GlobalDiscovery | null>(null);
  const [near, setNear] = useState<Nearby | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Each call degrades on its own: a hidden location or a cold cache must
      // never blank the whole dashboard.
      const [s, g, n] = await Promise.all([
        stats().catch(() => null),
        globalDiscovery().catch(() => null),
        nearby().catch(() => null),
      ]);
      if (cancelled) return;
      setSummary(s);
      setMap(g);
      setNear(n);
      setSettled(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const unreachable = settled && !summary && !map;

  return (
    <div className="mx-auto max-w-[1280px] py-2 sm:py-4">
      <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="label-sm inline-flex items-center gap-1.5 text-accent">
            <Sparkles size={12} /> Home
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-[2rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-4xl">
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
            className="btn-accent col-span-2 min-h-11 text-sm shadow-lg shadow-accent/25 sm:col-span-1"
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

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DashboardPanel
          icon={BookMarked}
          title="My bookshelf"
          hint="Private rows stay private — only you see them"
          action={
            <Link
              href="/me/bookshelf"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-strong"
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
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-strong"
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
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-strong"
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
              className="text-[11px] font-semibold text-accent hover:text-accent-strong"
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
