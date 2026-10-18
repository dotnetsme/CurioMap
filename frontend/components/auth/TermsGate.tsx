"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { acceptTerms, termsStatus } from "@/lib/api/auth";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

/**

/**
 * Terms-of-Use re-consent gate. Shown once, above any signed-in surface, when
 * the reader's accepted version is missing (legacy accounts) or older than the
 * current version. Acceptance is recorded server-side (terms_version +
 * terms_accepted_at), so the check is auditable, not cosmetic.
 */
export function TermsGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "current" | "required">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await termsStatus();
        if (!cancelled) setState(status.isCurrent ? "current" : "required");
      } catch {
        // Fail open on transient API errors: do not lock readers out because
        // the consent endpoint hiccuped. The next navigation re-checks.
        if (!cancelled) setState("current");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || state === "loading") return null;
  if (state === "current") return <>{children}</>;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await acceptTerms();
      setState("current");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record acceptance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="night-panel mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-3xl px-8 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-strong">
        <ScrollText size={26} />
      </span>
      <h1 className="font-display text-2xl font-bold text-ink">Terms of Use updated</h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        We&apos;ve revised our Terms of Use (version 1.0). To keep using CurioMap,
        please review and accept the updated terms. Your reading data, streaks,
        and privacy settings are unchanged.
      </p>
      <div className="flex flex-col items-center gap-3">
        <Button onClick={() => void accept()} disabled={busy}>
          {busy ? "Recording…" : "Review & accept"}
        </Button>
        <Link
          href="/policy/terms"
          target="_blank"
          className="text-sm font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
        >
          Read the full Terms of Use
        </Link>
      </div>
      {error ? <p className="text-sm text-heat-hot">{error}</p> : null}
      <p className="text-[11px] text-ink-faint">
        Don&apos;t want to accept? You can stop using CurioMap and request account
        deletion via security@curiomap.app.
      </p>
    </div>
  );
}
