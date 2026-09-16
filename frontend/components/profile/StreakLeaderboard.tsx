"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { Avatar } from "./Avatar";
import { getStreakLeaderboard } from "@/lib/api/streak";
import type { StreakLeaderboardEntry } from "@/types";

const RANK_STYLES = [
  "bg-amber-500/15 text-amber-600",
  "bg-slate-400/20 text-slate-600",
  "bg-orange-500/15 text-orange-600",
];

export function StreakLeaderboard({ limit = 10 }: { limit?: number }) {
  const [entries, setEntries] = useState<StreakLeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getStreakLeaderboard();
        if (!cancelled) setEntries(list.slice(0, limit));
      } catch {
        // Supplementary widget — fail silently.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (!entries || entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-col gap-3 p-5"
    >
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-amber-500" aria-hidden />
        <h3 className="text-base font-semibold text-ink">Streak leaderboard</h3>
      </div>
      <ol className="flex flex-col gap-1">
        {entries.map((e, i) => (
          <li key={e.userId}>
            <Link
              href={`/users/${e.userId}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  i < 3 ? RANK_STYLES[i] : "bg-surface-2 text-ink-3"
                }`}
              >
                {i + 1}
              </span>
              <Avatar avatarId={e.avatarId} name={e.displayName} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {e.displayName}
                </span>
                <span className="text-[11px] text-ink-muted">
                  {e.badgeCount} badge{e.badgeCount === 1 ? "" : "s"}
                </span>
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                <Flame className="size-3.5" aria-hidden />
                {e.currentStreak}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}