"use client";

import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
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
      <p className="text-xs text-ink-faint">Matched at: {scopeLabels[scope] ?? scope} level</p>
      {readers.map((reader) => (
        <div key={reader.user.id} className="surface p-4">
          <div className="flex items-center gap-3">
            <Link href={`/users/${reader.user.id}`}>
              <Avatar avatarId={reader.user.avatarId} name={reader.user.displayName} size={44} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/users/${reader.user.id}`}
                className="font-medium text-ink hover:text-accent-ink"
              >
                {reader.user.displayName}
              </Link>
              <p className="text-xs text-ink-faint">
                📍 {[reader.location.city, reader.location.country].filter(Boolean).join(", ")}
              </p>
            </div>
            {user && user.id !== reader.user.id ? (
              <FollowButton userId={reader.user.id} isFollowing={null} />
            ) : null}
          </div>
          {reader.books.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-faint">Currently reading:</span>
              {reader.books.map((b) => (
                <Link key={b.id} href={`/books/${b.id}`}>
                  <Badge tone="accent">{b.title}</Badge>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
