"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProfileHeader } from "./ProfileHeader";
import { FollowButton } from "./FollowButton";
import { ChallengeCard } from "./ChallengeCard";
import { StreakCard } from "./StreakCard";
import { StreakLeaderboard } from "./StreakLeaderboard";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { getProfile } from "@/lib/api/users";
import { useAuth } from "@/components/providers/AuthProvider";
import type { PublicProfile } from "@/types";

/**
 * Single renderer for both public profiles (/users/:id) and your own view
 * (/me). Self-awareness is derived from the session, not a prop:
 * - ChallengeCard is self-only (it fetches /me/challenge — showing it on
 *   someone else's profile would leak your challenge into their page).
 * - StreakCard gets the badge-celebrating own variant for self.
 * - The bookshelf shortcut points at /me/bookshelf (with private entries)
 *   for self instead of the public shelf.
 */
export function ProfilePageView({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getProfile(userId);
        if (!cancelled) setProfile(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (error) return <ErrorState message={error} />;
  if (!profile) return <PageLoading />;

  const isSelf = user?.id === profile.id;

  return (
    <div className="flex flex-col gap-6 py-4">
      <ProfileHeader
        profile={profile}
        bookshelfHref={isSelf ? "/me/bookshelf" : undefined}
        actions={
          isSelf ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/home" className="btn-ghost text-sm">
                Open dashboard
              </Link>
              <Link href="/me/settings" className="btn-ghost text-sm">
                Edit profile
              </Link>
            </div>
          ) : user && user.id !== profile.id ? (
            <FollowButton
              userId={profile.id}
              isFollowing={profile.isFollowing}
              onChange={() =>
                setProfile((p) =>
                  p
                    ? {
                        ...p,
                        followersCount: p.followersCount + (p.isFollowing ? -1 : 1),
                        isFollowing: !p.isFollowing,
                      }
                    : p,
                )
              }
            />
          ) : null
        }
      />
      {isSelf ? <ChallengeCard /> : null}
      {isSelf ? <StreakCard /> : <StreakCard userId={profile.id} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Reading", value: profile.bookshelfSummary.reading },
          { label: "Finished", value: profile.bookshelfSummary.finished },
          { label: "Wishlist", value: profile.bookshelfSummary.wishlist },
          { label: "Followers", value: profile.followersCount },
        ].map((s) => (
          <div key={s.label} className="glass p-4 text-center">
            <p className="text-2xl font-bold text-gradient">{s.value}</p>
            <p className="text-xs text-ink-faint">{s.label}</p>
          </div>
        ))}
      </div>
      {isSelf ? <StreakLeaderboard /> : null}
    </div>
  );
}
