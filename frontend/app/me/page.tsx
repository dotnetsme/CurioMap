"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StreakCard } from "@/components/profile/StreakCard";
import { StreakLeaderboard } from "@/components/profile/StreakLeaderboard";
import { BookshelfEntryCard } from "@/components/bookshelf/BookshelfEntryCard";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { getProfile } from "@/lib/api/users";
import { myShelf } from "@/lib/api/bookshelf";
import type { BookshelfEntry, PublicProfile } from "@/types";

export default function MyProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [entries, setEntries] = useState<BookshelfEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      try {
        const [p, shelf] = await Promise.all([getProfile(user.id), myShelf()]);
        setProfile(p);
        setEntries(shelf.filter((e) => e.status === "reading").slice(0, 5));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();
  }, [user, loading]);

  if (loading) return <PageLoading />;
  if (!user) {
    return (
      <div className="glass p-6 text-sm text-slate-300">
        <Link href="/auth/login" className="text-violet-300 underline">
          Sign in
        </Link>{" "}
        to see your profile.
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!profile) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader
        profile={profile}
        actions={
          <Link
            href="/me/settings"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
          >
            Edit profile
          </Link>
        }
      />
      <StreakCard />
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-white">Currently reading</h2>
          <Link href="/me/bookshelf" className="text-sm text-violet-300 hover:text-violet-200">
            My bookshelf →
          </Link>
        </div>
        {entries.length === 0 ? (
          <div className="glass p-5 text-sm text-slate-400">
            Nothing on your shelf yet.{" "}
            <Link href="/books/search" className="text-violet-300 underline">
              Find a book
            </Link>
            .
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <BookshelfEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
      <StreakLeaderboard />
    </div>
  );
}
