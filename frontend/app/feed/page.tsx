"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { FeedList } from "@/components/feed/FeedList";
import { Button } from "@/components/ui/Button";
import { BookCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Feedback";
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

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-sm inline-flex items-center gap-1.5 text-accent-strong">
            <Flame size={12} /> Activity
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Your feed
          </h1>
          <p className="mt-1 text-sm text-ink-muted">People you follow · books you care about</p>
        </div>
      </div>
      {!events ? (
        <div className="flex flex-col gap-3">
          <BookCardSkeleton />
          <BookCardSkeleton />
          <BookCardSkeleton />
        </div>
      ) : (
        <>
          <FeedList events={events} />
          {nextOffset ? (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                isLoading={loadingMore}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}