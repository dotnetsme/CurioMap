"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CircleList } from "@/components/circles/CircleList";
import { NewCircleForm } from "@/components/circles/NewCircleForm";
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
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search circles…"
            className="w-full rounded-full border border-ink-3/30 bg-surface py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSort("recent")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              sort === "recent" ? "bg-accent text-white" : "bg-surface text-ink-2 hover:bg-accent/10"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSort("members")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              sort === "members" ? "bg-accent text-white" : "bg-surface text-ink-2 hover:bg-accent/10"
            }`}
          >
            Most members
          </button>
        </div>
      </div>

      <NewCircleForm
        onCreated={(c) => setCircles((prev) => [c, ...prev])}
      />

      {status === "loading" && circles.length === 0 ? (
        <CircleList circles={[]} status="loading" />
      ) : circles.length === 0 && status === "idle" ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <Users size={48} className="text-ink-3" />
          <h3 className="text-lg font-semibold text-ink">No circles found</h3>
          <p className="text-sm text-ink-3">
            {query
              ? "Try a different search term."
              : "Be the first to start a reading circle!"}
          </p>
        </div>
      ) : (
        <CircleList circles={circles} status={status} />
      )}
    </div>
  );
}
