"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { getMyStreakCalendar, getStreak, getStreakCalendar, getStreakForUser } from "@/lib/api/streak";
import { BADGE_CATALOG } from "@/lib/badges";
import type { StreakCalendar as StreakCalendarType, StreakStats as StreakStatsType } from "@/types";
import { Flame, Lock, Snowflake } from "lucide-react";
import { BadgeToast, diffNewBadges } from "./BadgeToast";

export function StreakCard({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<StreakStatsType | null>(null);
  const [calendar, setCalendar] = useState<StreakCalendarType | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // With a userId, show that reader's public streak (profile pages);
        // otherwise the signed-in viewer's own streak (/me). The calendar is
        // best-effort: a failure only drops the heatmap, never the card.
        const [streakResult, calendarResult] = await Promise.allSettled([
          userId ? getStreakForUser(userId) : getStreak(),
          userId ? getStreakCalendar(userId) : getMyStreakCalendar(),
        ]);
        if (cancelled) return;
        if (streakResult.status === "fulfilled") {
          const s = streakResult.value;
          setStats(s);
          if (!userId) {
            // Celebrate freshly-earned badges (own streak only). First-ever
            // load initializes the seen-store silently — no toast storm.
            setNewBadges(diffNewBadges(s.badges.map((b) => b.kind)));
          }
        }
        if (calendarResult.status === "fulfilled") {
          setCalendar(calendarResult.value);
        }
      } catch {
        // Gamification is supplementary — fail silently (e.g. private shelves 403).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!stats) return null;

  const earnedMap = new Map(stats.badges.map((b) => [b.kind, b.awardedAt]));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex flex-col gap-4 p-6"
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <Flame
            className={`size-8 transition-transform duration-300 ${
              stats.activeToday
                ? "text-amber drop-shadow-[0_0_12px_rgba(245,158,11,0.65)] animate-pulse"
                : "text-ink-muted"
            }`}
            aria-hidden
          />
          <div className="text-center sm:text-left">
            <h3 className="font-display text-base font-bold text-ink-strong">
              {stats.currentStreak}-day streak
            </h3>
            <p className="text-sm text-ink-muted">
              Longest: {stats.longestStreak}
              {stats.freezeCount > 0 ? (
                <span
                  title="Freezes shield your streak across a missed day"
                  className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-signal"
                >
                  <Snowflake className="size-3.5" aria-hidden /> {stats.freezeCount}
                </span>
              ) : null}{" "}
              ·{" "}
              {stats.activeToday ? (
                <span className="font-semibold text-signal">Active today</span>
              ) : (
                "Read something to keep it alive"
              )}
            </p>
          </div>
          <span className="label-sm text-ink-muted sm:ml-auto">
            {stats.badges.length} of {Object.keys(BADGE_CATALOG).length} badges
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Object.entries(BADGE_CATALOG).map(([kind, meta]) => {
            const earned = earnedMap.has(kind);
            const Icon = earned ? meta.icon : Lock;
            return (
              <div
                key={kind}
                title={earned ? `${meta.name} — ${meta.description}` : `${meta.description} (locked)`}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all ${
                  earned
                    ? "border-amber/40 bg-amber-soft/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                    : "border-line bg-stage-2 opacity-50"
                }`}
              >
                <Icon
                  className={`size-4 ${earned ? "text-amber" : "text-ink-muted"}`}
                  aria-hidden
                />
                <span className="text-[10px] leading-tight text-ink-muted">{meta.name}</span>
              </div>
            );
          })}
        </div>

        {calendar ? (
          <ReadingHeatmap activeDays={calendar.activeDays} days={calendar.days} />
        ) : null}
      </motion.div>
      {!userId ? (
        <BadgeToast kinds={newBadges} onDismiss={() => setNewBadges([])} />
      ) : null}
    </>
  );
}

/**
 * Compact GitHub-style activity heatmap: one column per week (Monday-first),
 * amber cells mark UTC days with qualifying reading activity.
 */
function ReadingHeatmap({ activeDays, days }: { activeDays: string[]; days: number }) {
  const active = useMemo(() => new Set(activeDays), [activeDays]);
  const [cells, setCells] = useState<{ iso: string; active: boolean }[]>([]);

  useEffect(() => {
    // Built in an effect: `Date.now()` is impure and must not run during render.
    const now = Date.now();
    const list: { iso: string; active: boolean }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const iso = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
      list.push({ iso, active: active.has(iso) });
    }
    setCells(list);
  }, [active, days]);

  // Column-major grid (7 rows = weekdays); pad so the first column starts Monday.
  const leadPad =
    cells.length > 0 ? (new Date(`${cells[0].iso}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="label-sm text-ink-muted">Last {Math.round(days / 7)} weeks of reading</p>
        <p className="flex items-center gap-1 text-[10px] text-ink-faint">
          less
          <span className="size-[9px] rounded-[2px] bg-stage-3 border border-line/40" aria-hidden />
          <span className="size-[9px] rounded-[2px] bg-amber shadow-[0_0_4px_rgba(245,158,11,0.5)]" aria-hidden />
          more
        </p>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label="Reading activity heatmap">
        {Array.from({ length: leadPad }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {cells.map((c) => (
          <span
            key={c.iso}
            title={c.iso}
            className={`size-[10px] rounded-[2px] transition-colors ${
              c.active
                ? "bg-amber shadow-[0_0_6px_rgba(245,158,11,0.55)]"
                : "bg-stage-3 border border-line/30 hover:border-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}