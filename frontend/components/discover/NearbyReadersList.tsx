"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { useAuth } from "@/components/providers/AuthProvider";
import type { NearbyReader } from "@/types";

const scopeLabels: Record<string, string> = {
  city: "your city",
  region: "your region",
  country: "your country",
};

export function NearbyReadersList({ scope, readers }: { scope: string; readers: NearbyReader[] }) {
  const { user } = useAuth();

  if (readers.length === 0) {
    return (
      <EmptyState
        title={`No readers found in ${scopeLabels[scope] ?? "your area"} yet`}
        hint="Share CurioMap — the map grows one curious reader at a time."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        <ShieldCheck size={13} className="text-reading" />
        Matched at {scopeLabels[scope] ?? scope} level · locations fuzzed to ~15 km
      </p>
      {readers.map((reader, i) => (
        <Reveal key={reader.user.id} delay={Math.min(i, 8) * 0.05}>
          <div className="card card-hover p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Link href={`/users/${reader.user.id}`} className="transition hover:scale-105">
                <Avatar avatarId={reader.user.avatarId} name={reader.user.displayName} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${reader.user.id}`}
                  className="font-semibold text-ink hover:text-accent-ink"
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
