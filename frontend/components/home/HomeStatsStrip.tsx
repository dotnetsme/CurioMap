import { BookOpen, Globe2, MessagesSquare, Radar } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import type { StatsSummary } from "@/types";

const defs = [
  { key: "books", label: "books mapped", icon: BookOpen, tint: "text-accent" },
  { key: "readers", label: "curious readers", icon: Globe2, tint: "text-signal" },
  { key: "conversations", label: "reading circles", icon: MessagesSquare, tint: "text-signal" },
  { key: "activeRegions", label: "active regions", icon: Radar, tint: "text-heat-hot" },
] as const;

/** Real numbers straight from /stats/summary — no invented "active now" counters. */
export function HomeStatsStrip({ stats }: { stats: StatsSummary | null }) {
  const values: Record<string, number | null> = {
    books: stats?.books ?? null,
    readers: stats?.readers ?? null,
    conversations: stats?.conversations ?? null,
    activeRegions: stats?.activeRegions ?? null,
  };

  return (
    <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
      {defs.map((d) => (
        <div key={d.key} className="flex items-center gap-2.5 px-4 py-3.5">
          <d.icon size={17} className={`shrink-0 ${d.tint}`} aria-hidden />
          <div className="min-w-0">
            <dd className="font-mono text-lg font-semibold leading-none tabular-nums text-ink">
              {values[d.key] === null ? "—" : <CountUp value={values[d.key] as number} />}
            </dd>
            <dt className="mt-1 truncate text-[11px] font-medium text-ink-faint">{d.label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}
