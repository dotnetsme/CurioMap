"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Search, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CircleList } from "@/components/circles/CircleList";
import { NewCircleForm } from "@/components/circles/NewCircleForm";
import { EmptyState } from "@/components/ui/Feedback";
import { listCircles } from "@/lib/api/circles";
import type { Circle } from "@/types";

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await listCircles({ q: query || undefined, sort });
      setCircles(res.items);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [query, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 py-4">
      <SectionHeading
        eyebrow="Community"
        title="Reading Circles"
        hint="Small groups discussing books together. Join one or start your own."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search circles by name, topic, or book…"
            className="w-full min-h-11 rounded-full border border-line bg-stage-2/80 py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSort("recent")}
            className={`min-h-10 cursor-pointer rounded-full px-4 py-2 text-xs transition focus-visible:ring-2 focus-visible:ring-accent ${
              sort === "recent"
                ? "bg-accent text-accent-ink font-semibold shadow-sm"
                : "border border-line bg-stage-2 text-ink-muted hover:border-line-2 hover:text-ink"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSort("members")}
            className={`min-h-10 cursor-pointer rounded-full px-4 py-2 text-xs transition focus-visible:ring-2 focus-visible:ring-accent ${
              sort === "members"
                ? "bg-accent text-accent-ink font-semibold shadow-sm"
                : "border border-line bg-stage-2 text-ink-muted hover:border-line-2 hover:text-ink"
            }`}
          >
            Most members
          </button>
          <button
            onClick={() => setSort("streak")}
            className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs transition focus-visible:ring-2 focus-visible:ring-accent ${
              sort === "streak"
                ? "bg-accent text-accent-ink font-semibold shadow-sm"
                : "border border-line bg-stage-2 text-ink-muted hover:border-line-2 hover:text-ink"
            }`}
          >
            <Flame size={14} /> Hottest streaks
          </button>
        </div>
      </div>

      <NewCircleForm
        onCreated={(c) => setCircles((prev) => [c, ...prev])}
      />

      {status === "loading" && circles.length === 0 ? (
        <CircleList circles={[]} status="loading" />
      ) : circles.length === 0 && status === "idle" ? (
        <div className="card p-6">
          <EmptyState
            icon={Users}
            title="No reading circles found"
            hint={
              query
                ? "Try a different search term or genre."
                : "Be the first to start a reading circle for your favorite book!"
            }
          />
        </div>
      ) : (
        <CircleList circles={circles} status={status} />
      )}
    </div>
  );
}
