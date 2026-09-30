"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Nearby, NearbyReader } from "@/types";

const scopeLabels = {
  city: "your city",
  region: "your region",
  country: "your country",
} as const;

function placeOf(reader: NearbyReader): string {
  return [reader.location.city, reader.location.region, reader.location.country]
    .filter(Boolean)
    .join(", ");
}

export function NearbyReadersList({
  scope,
  readers,
  /** Slim rows for dashboard columns — no per-reader follow control. */
  compact = false,
  /** Render at most this many readers (the API already enforces its own maximum). */
  limit,
}: {
  scope: Nearby["scope"];
  readers: NearbyReader[];
  compact?: boolean;
  limit?: number;
}) {
  const { user } = useAuth();
  const shown = typeof limit === "number" ? readers.slice(0, limit) : readers;

  if (shown.length === 0) {
    return (
      <EmptyState
        title={`No readers found in ${scopeLabels[scope] ?? "your area"} yet`}
        hint="Share CurioMap — the map grows one curious reader at a time."
      />
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
          <ShieldCheck size={12} className="shrink-0 text-reading" />
          {scopeLabels[scope] ?? scope} · fuzzed to ~15 km
        </p>
        <ul className="mt-1 flex flex-col divide-y divide-line">
          {shown.map((reader) => {
            const place = placeOf(reader);
            return (
              <li key={reader.user.id} className="flex items-center gap-3 py-2.5">
                <Link
                  href={`/users/${reader.user.id}`}
                  className="shrink-0 rounded-full transition hover:scale-105"
                >
                  <Avatar avatarId={reader.user.avatarId} name={reader.user.displayName} size={38} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/users/${reader.user.id}`}
                    className="block truncate text-sm font-semibold text-ink hover:text-accent-strong"
                  >
                    {reader.user.displayName}
                  </Link>
                  {reader.books.length > 0 ? (
                    <p className="truncate text-[11.5px] text-ink-faint">
                      Reading{" "}
                      <Link
                        href={`/books/${reader.books[0].id}`}
                        className="font-medium text-ink-2 hover:text-accent-strong"
                      >
                        {reader.books[0].title}
                      </Link>
                    </p>
                  ) : (
                    <p className="truncate text-[11.5px] text-ink-faint">{place || "Reading now"}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        <ShieldCheck size={13} className="text-reading" />
        Matched at {scopeLabels[scope] ?? scope} level · locations fuzzed to ~15 km
      </p>
      {shown.map((reader, i) => (
        <Reveal key={reader.user.id} delay={Math.min(i, 8) * 0.05}>
          <div className="card card-hover p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Link href={`/users/${reader.user.id}`} className="transition hover:scale-105">
                <Avatar avatarId={reader.user.avatarId} name={reader.user.displayName} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${reader.user.id}`}
                  className="font-semibold text-ink hover:text-accent-strong transition-colors"
                >
                  {reader.user.displayName}
                </Link>
                <p className="text-xs text-ink-faint">
                  {[reader.location.city, reader.location.country].filter(Boolean).join(", ")}
                </p>
              </div>
              {user && user.id !== reader.user.id ? (
                <FollowButton userId={reader.user.id} isFollowing={null} />
              ) : null}
            </div>
            {reader.books.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs">
                <span className="label-sm text-ink-faint">Reading now</span>
                {reader.books.map((b) => (
                  <Link key={b.id} href={`/books/${b.id}`}>
                    <Badge tone="accent">{b.title}</Badge>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
