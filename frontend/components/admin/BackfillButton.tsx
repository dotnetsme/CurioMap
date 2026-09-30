"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { backfillBadges } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";

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
      <Button
        variant="ghost"
        onClick={run}
        isLoading={busy}
        className="text-sm"
      >
        <Sparkles size={16} aria-hidden />
        Run badge backfill
      </Button>
      {result ? <p className="text-xs font-semibold text-signal">{result}</p> : null}
      {error ? <p className="text-xs font-medium text-heat-hot">{error}</p> : null}
    </div>
  );
}