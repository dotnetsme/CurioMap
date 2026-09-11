"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, LibraryBig, LogIn, MapPin, ShieldCheck } from "lucide-react";
import { NearbyReadersList } from "@/components/discover/NearbyReadersList";
import { ReaderCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Feedback";
import { useAuth } from "@/components/providers/AuthProvider";
import { nearby } from "@/lib/api/discover";
import type { Nearby } from "@/types";

export default function NearbyPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Nearby | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await nearby();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load nearby readers");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex max-w-2xl flex-col gap-3 py-4">
        <ReaderCardSkeleton />
        <ReaderCardSkeleton />
        <ReaderCardSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="night-panel mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl px-8 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
          <MapPin size={26} />
        </span>
        <h1 className="font-display text-3xl font-bold text-amber-50">Readers near you</h1>
        <p className="text-sm leading-relaxed text-amber-100/65">
          Sign in to discover curious readers in your city. Your location stays fuzzed to a ~15 km
          grid — never exact, always reversible.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-night transition hover:bg-amber-300"
          >
            <LogIn size={15} /> Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-white/5"
          >
            <Compass size={15} /> Join free
          </Link>
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-sm text-accent-strong">Nearby discovery</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Readers near you
          </h1>
          {data ? (
            <p className="mt-1.5 text-sm text-ink-muted">
              {data.readers.length} curious reader{data.readers.length === 1 ? "" : "s"} matched at{" "}
              <strong>{data.scope}</strong> level
            </p>
          ) : null}
        </div>
        <Link href="/me/settings" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline">
          <ShieldCheck size={13} /> Manage location privacy
        </Link>
      </div>

      {!data ? (
        <div className="flex flex-col gap-3">
          <ReaderCardSkeleton />
          <ReaderCardSkeleton />
          <ReaderCardSkeleton />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-xs text-ink-muted">
            <LibraryBig size={15} className="shrink-0 text-accent-strong" />
            Tip: readers with shared books make the best circle partners. Say hi with a book you both love.
          </div>
          <NearbyReadersList scope={data.scope} readers={data.readers} />
        </>
      )}
    </div>
  );
}