"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { backfillBadges } from "@/lib/api/admin";

/**
 * Admin one-shot: awards every badge readers already qualify for from
 * historical data. Idempotent server-side; safe to click repeatedly.
 */
export function BackfillButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await backfillBadges();
      setResult(`Scanned ${r.usersScanned} readers · awarded ${r.badgesAwarded} badges.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="btn-ghost text-sm disabled:opacity-50"
      >
        <Sparkles size={16} className={busy ? "animate-pulse" : ""} aria-hidden />
        {busy ? "Backfilling…" : "Run badge backfill"}
      </button>
      {result ? <p className="text-xs text-signal">{result}</p> : null}
      {error ? <p className="text-xs text-heat-hot">{error}</p> : null}
    </div>
  );
}