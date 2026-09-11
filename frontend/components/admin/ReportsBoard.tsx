"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { timeAgo } from "@/lib/time";
import * as adminApi from "@/lib/api/admin";
import { useAuth } from "@/components/providers/AuthProvider";
import type { AdminReport } from "@/types";

export function ReportsBoard() {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");

  const load = useCallback(async () => {
    setError(null);
    try {
      setReports(await adminApi.reports(filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    }
  }, [filter]);

  useEffect(() => {
    if (!loading && user?.isAdmin) {
      void load();
    }
  }, [loading, user?.isAdmin, load]);

  if (loading) return <PageLoading />;
  if (!user?.isAdmin) {
    return <ErrorState message="Moderation tools are for admins only." />;
  }

  async function act(reportId: string, action: "dismiss" | "remove_message" | "mute_message") {
    setBusy(reportId);
    try {
      await adminApi.resolve(reportId, action);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {["open", "resolved_actioned", "resolved_dismissed", "all"].map((s) => (
          <button
            key={s}
            className={`chip ${filter === s ? "chip-active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {error ? <ErrorState message={error} /> : null}
      {!reports ? <PageLoading /> : null}

            {reports?.length === 0 ? <p className="text-sm text-ink-3">No reports in this state.</p> : null}

      <div className="flex flex-col gap-3">
        {reports?.map((r) => (
          <div key={r.id} className="glass p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={r.status === "open" ? "amber" : "emerald"}>{r.status}</Badge>
              <Badge tone="slate">message: {r.messageStatus}</Badge>
              <span className="text-xs text-slate-500">
                              by @{r.reporter.handle} · {timeAgo(r.createdAt)}
              </span>
            </div>
                        <p className="mt-2 text-sm text-ink-2">“{r.messageContent}”</p>
            <p className="mt-1 text-xs text-ink-3">
              reason: {r.reason} — author @{r.author.handle}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="danger"
                disabled={busy !== null}
                onClick={() => void act(r.id, "remove_message")}
              >
                Delete message
              </Button>
              <Button variant="ghost" disabled={busy !== null} onClick={() => void act(r.id, "mute_message")}>
                Mute message
              </Button>
              <Button variant="subtle" disabled={busy !== null} onClick={() => void act(r.id, "dismiss")}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
