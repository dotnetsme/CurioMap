"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { badgeMeta } from "@/lib/badges";

const SEEN_KEY = "curiomap.seenBadges";

/**
 * Compares the freshly fetched badge kinds against the locally seen ones.
 * First-ever load initializes the store silently (users who already earned
 * badges before this feature shipped get no toast storm). Returns the
 * kinds earned since the last visit.
 */
export function diffNewBadges(kinds: string[]): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (raw === null) {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(kinds));
      return [];
    }
    const seen = new Set<string>(
      JSON.parse(raw) as string[],
    );
    const fresh = kinds.filter((k) => !seen.has(k));
    if (fresh.length > 0) {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh]));
    }
    return fresh;
  } catch {
    // Storage unavailable — badges simply never toast.
    return [];
  }
}

export function BadgeToast({ kinds, onDismiss }: { kinds: string[]; onDismiss: () => void }) {
  const count = kinds.length;

  useEffect(() => {
    if (count === 0) return;
    const timer = setTimeout(onDismiss, 6000 + count * 800);
    return () => clearTimeout(timer);
  }, [count, onDismiss]);

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-4 right-4 z-50 w-72"
          role="status"
          aria-live="polite"
        >
          <div className="glass flex flex-col gap-2.5 rounded-2xl border border-amber-500/40 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="label-sm text-amber-500">
                {count === 1 ? "Badge earned!" : `${count} badges earned!`}
              </span>
              <button
                onClick={onDismiss}
                aria-label="Dismiss"
                className="cursor-pointer text-ink-muted transition hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {kinds.map((kind) => {
              const meta = badgeMeta(kind);
              const Icon = meta.icon;
              return (
                <div key={kind} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{meta.name}</p>
                    <p className="truncate text-xs text-ink-muted">{meta.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}