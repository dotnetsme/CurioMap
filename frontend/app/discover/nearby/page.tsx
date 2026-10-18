"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LibraryBig, MapPin, ShieldCheck } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { NearbyReadersList } from "@/components/discover/NearbyReadersList";
import { ReaderCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Feedback";
import { nearby } from "@/lib/api/discover";
import type { Nearby } from "@/types";

function NearbyBody() {
  const [data, setData] = useState<Nearby | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Nearby discovery</p>
          <h1 className="mt-1 display text-4xl text-ink-strong sm:text-5xl">
            Readers near you
          </h1>
          {data ? (
            <p className="mt-1.5 text-sm text-ink-muted">
              {data.readers.length} curious reader{data.readers.length === 1 ? "" : "s"} matched at{" "}
              <strong>{data.scope}</strong> level
            </p>
          ) : null}
        </div>
        <Link href="/me/settings" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint underline-offset-2 hover:text-ink hover:underline">
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

export default function NearbyPage() {
  return (
    <AuthGate
      icon={MapPin}
      title="Readers near you"
      body="Sign in to discover curious readers in your city. Your location stays fuzzed to a ~15 km grid — never exact, always reversible."
    >
      <NearbyBody />
    </AuthGate>
  );
}