"use client";

import { Avatar } from "@/components/profile/Avatar";
import type { RegionStat, StatsSummary } from "@/types";

const W = 1000;
const H = 500;

function project(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

/**
 * The CurioMap "constellation": an equirectangular projection of regional
 * reading activity. Deliberately dependency-free — fuzzed coordinates only.
 */
export function GlobalMap({ regions }: { regions: RegionStat[] }) {
  const max = Math.max(1, ...regions.map((r) => r.activeReaders));

  return (
    <div className="glass overflow-hidden p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Global curiosity heatmap">
        <defs>
          <radialGradient id="dot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="#0a0f1f" />

        {/* graticule */}
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            x2={W}
            y1={(i / 10) * H}
            y2={(i / 10) * H}
            stroke="#ffffff"
            strokeOpacity="0.05"
          />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <line
            key={`v${i}`}
            y1="0"
            y2={H}
            x1={(i / 12) * W}
            x2={(i / 12) * W}
            stroke="#ffffff"
            strokeOpacity="0.05"
          />
        ))}

        {regions
          .filter((r) => r.lat !== null && r.lng !== null)
          .map((r, i) => {
            const { x, y } = project(r.lat!, r.lng!);
            const intensity = r.activeReaders / max;
            const radius = 6 + intensity * 26;
            return (
              <g key={`${r.country}-${r.region}-${i}`}>
                <circle cx={x} cy={y} r={radius} fill="url(#dot)">
                  <title>{`${r.country}${r.region ? ` / ${r.region}` : ""} — ${r.activeReaders} readers`}</title>
                </circle>
                <circle cx={x} cy={y} r={2.5} fill="#e9d5ff" fillOpacity={0.5 + intensity * 0.5} />
              </g>
            );
          })}
      </svg>
    </div>
  );
}

export function StatsBar({ stats }: { stats: StatsSummary }) {
  const items = [
    { label: "readers", value: stats.readers },
    { label: "books", value: stats.books },
    { label: "conversations", value: stats.conversations },
    { label: "messages", value: stats.messages },
    { label: "active regions", value: stats.activeRegions },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="glass p-4 text-center">
          <p className="text-2xl font-bold text-gradient">{item.value}</p>
          <p className="text-xs text-slate-400">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function TopReadersStrip({ regions }: { regions: RegionStat[] }) {
  const top = regions.slice(0, 8);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {top.map((r, i) => (
        <div key={`${r.country}-${r.region}-${i}`} className="glass p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-medium text-white">
              {r.region ? `${r.region}, ` : ""}
              {r.country}
            </p>
            <span className="text-xs text-cyan-300">{r.activeReaders} reading</span>
          </div>
          {r.topBooks.length > 0 ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Avatar avatarId="curio-15" size={18} />
              <span className="truncate">
                Top: {r.topBooks.map((b) => b.title).slice(0, 3).join(" · ")}
              </span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
