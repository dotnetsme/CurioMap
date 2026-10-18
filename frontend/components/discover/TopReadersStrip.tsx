"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import type { RegionStat } from "@/types";

export function TopReadersStrip({ regions }: { regions: RegionStat[] }) {
  const top = [...regions].sort((a, b) => b.activeReaders - a.activeReaders).slice(0, 6);
  const max = Math.max(1, ...top.map((r) => r.activeReaders));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {top.map((r, i) => (
        <Reveal key={`${r.country}-${r.region}-${i}`} delay={i * 0.06}>
          <div className="card card-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-semibold text-ink/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold text-ink">
                    {r.region ? `${r.region}, ` : ""}
                    {r.country}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-signal">
                    <Flame size={12} /> {r.activeReaders} reading now
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fill-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-signal via-accent to-heat-hot"
                style={{ width: `${Math.max(8, (r.activeReaders / max) * 100)}%` }}
              />
            </div>
            {r.topBooks.length > 0 ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <Avatar avatarId="curio-15" size={20} />
                <span className="truncate">
                  Hot:{" "}
                  <Link href={`/books/${r.topBooks[0].id}`} className="font-medium text-ink hover:text-accent">
                    {r.topBooks[0].title}
                  </Link>
                  {r.topBooks[1] ? ` · ${r.topBooks[1].title}` : ""}
                </span>
              </div>
            ) : null}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
