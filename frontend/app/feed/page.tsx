"use client";

import { useEffect, useState } from "react";
import { FeedList } from "@/components/feed/FeedList";
import { Button } from "@/components/ui/Button";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { feed } from "@/lib/api/feed";
import type { FeedEvent } from "@/types";

export default function FeedPage() {
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const f = await feed(30, 0);
        setEvents(f.items);
        setNextOffset(f.nextOffset);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your feed");
      }
    })();
  }, []);

  async function loadMore() {
    if (!nextOffset) return;
    setLoadingMore(true);
    try {
      const f = await feed(30, nextOffset);
      setEvents((prev) => [...(prev ?? []), ...f.items]);
      setNextOffset(f.nextOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!events) return <PageLoading />;

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Your feed</h1>
        <span className="text-xs text-slate-500">people you follow · books you care about</span>
      </div>
      <FeedList events={events} />
      {nextOffset ? (
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}