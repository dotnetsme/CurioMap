"use client";

import { useEffect, useState } from "react";
import { NearbyReadersList } from "@/components/discover/NearbyReadersList";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { useAuth } from "@/components/providers/AuthProvider";
import { nearby } from "@/lib/api/discover";
import type { Nearby } from "@/types";

export default function NearbyPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Nearby | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    (async () => {
      try {
        setData(await nearby());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load nearby readers");
      }
    })();
  }, [user, loading]);

  if (loading) return <PageLoading />;
  if (!user) {
    return <ErrorState message="Sign in to discover readers near you." />;
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Readers near you</h1>
        <a href="/me/settings" className="text-xs text-slate-500 underline hover:text-slate-300">
          Manage location privacy
        </a>
      </div>
      <NearbyReadersList scope={data.scope} readers={data.readers} />
    </div>
  );
}