"use client";

import { useEffect, useState } from "react";
import { Flame, Snowflake } from "lucide-react";
import { getCircleStreak } from "@/lib/api/circles";
import type { CircleStreakStats } from "@/types";

/**
 * Compact group-streak chip for the circle detail header. Renders nothing
 * while loading or when the circle has no streak yet.
 */
export function CircleStreakChip({ handle }: { handle: string }) {
  const [stats, setStats] = useState<CircleStreakStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getCircleStreak(handle);
        if (!cancelled) setStats(s);
      } catch {
        // Gamification is supplementary — fail silently.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!stats || stats.currentStreak === 0) return null;

  return (
    <span
      className="flex items-center gap-1 text-sm"
      title={`Group streak: longest ${stats.longestStreak}${
        stats.freezeCount > 0 ? ` · ${stats.freezeCount} freeze${stats.freezeCount === 1 ? "" : "s"}` : ""
      }`}
    >
      <Flame size={16} className={stats.activeToday ? "text-amber" : "text-ink-faint"} aria-hidden />
      {stats.currentStreak}-day circle streak
      {stats.freezeCount > 0 ? (
        <span className="inline-flex items-center gap-0.5 text-accent">
          <Snowflake size={14} aria-hidden /> {stats.freezeCount}
        </span>
      ) : null}
    </span>
  );
}