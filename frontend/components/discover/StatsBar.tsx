"use client";

import { Flame, Globe2, MapPin } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import type { StatsSummary } from "@/types";

const defs = [
  { key: "readers", label: "curious readers", icon: Globe2, tint: "text-signal bg-signal/10" },
  { key: "books", label: "books mapped", icon: MapPin, tint: "text-accent bg-accent/10" },
  { key: "conversations", label: "reading circles", icon: Flame, tint: "text-heat-hot bg-heat-hot/10" },
] as const;

export function StatsBar({ stats }: { stats: StatsSummary }) {
  const values: Record<string, number> = {
    readers: stats.readers,
    books: stats.books,
    conversations: stats.conversations,
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {defs.map((d, i) => (
        <Reveal key={d.key} delay={i * 0.08}>
          <div className="card flex items-center gap-4 p-6">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${d.tint}`}>
              <d.icon size={20} strokeWidth={2.2} />
            </span>
            <div>
              <CountUp value={values[d.key]} className="stat-num" />
              <p className="mt-0.5 text-sm text-ink-faint">{d.label}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
