"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Ring } from "@/components/ui/Progress";
import { getChallengeStats, setChallengeTarget } from "@/lib/api/challenge";
import type { ChallengeStats as ChallengeStatsType } from "@/types";
import { Target, Flame, TrendingUp } from "lucide-react";

export function ChallengeCard() {
  const [stats, setStats] = useState<ChallengeStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getChallengeStats();
        if (!cancelled) {
          setStats(s);
          setTargetInput(s.target);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load challenge");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTarget = async () => {
    if (saving || targetInput < 1) return;
    setSaving(true);
    try {
      const updated = await setChallengeTarget(targetInput, stats?.year);
      setStats(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update target");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="glass h-40 w-full animate-pulse" />;
  }

  if (error || !stats) {
    return (
      <div className="glass flex h-40 items-center justify-center text-sm text-ink-muted">
        {error ?? "Challenge unavailable"}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start"
    >
      <Ring value={stats.finished} max={stats.target} size={96} stroke={9}>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-ink">{stats.finished}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">of {stats.target}</span>
        </div>
      </Ring>

      <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <Flame className="size-4 text-amber-500" />
          <h3 className="text-base font-semibold text-ink">{stats.year} Reading Challenge</h3>
        </div>

        <p className="text-sm text-ink-muted">
          {stats.aheadOfPace ? (
            <span className="inline-flex items-center gap-1 font-medium text-signal">
              <TrendingUp className="size-3.5" />
              Ahead of pace
            </span>
          ) : (
            "On track"
          )}{" "}
          · {stats.pct}% complete · ~{Number(stats.average).toFixed(1)}/mo
        </p>

        {editing ? (
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <input
              type="number"
              min={1}
              max={1000}
              value={targetInput}
              onChange={(e) => setTargetInput(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded-lg border border-ink/15 bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              aria-label="Challenge target"
            />
            <button
              onClick={saveTarget}
              disabled={saving}
              className="btn-primary px-3 py-1 text-sm disabled:opacity-50"
            >
              {saving ? "Saving" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setTargetInput(stats.target);
              }}
              className="btn-ghost px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="btn-ghost inline-flex w-fit items-center gap-1 px-3 py-1 text-sm"
          >
            <Target className="size-3.5" />
            {stats.target === 50 ? "Set target" : "Edit target"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
