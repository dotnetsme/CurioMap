"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { Skeleton } from "@/components/ui/Skeleton";
import { feed } from "@/lib/api/feed";
import { timeAgo } from "@/lib/time";
import type { FeedEvent } from "@/types";

const MAX_ITEMS = 4;

function verbOf(event: FeedEvent): string {
  switch (event.type) {
    case "conversation_created":
      return "opened a circle";
    case "message_posted":
      return "replied in";
    default:
      return "posted in";
  }
}

/**
 * Recent discussion activity from the people you follow (/feed). This replaces
 * the mockup's single hard-coded thread with the real circles/messages domain.
 */
export function DiscussionPanel() {
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await feed(20, 0);
        if (cancelled) return;
        setEvents(
          page.items
            .filter((e) => e.type === "conversation_created" || e.type === "message_posted")
            .slice(0, MAX_ITEMS),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load activity");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState message={error} />;

  if (!events) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="No discussions yet"
        hint="Follow readers from the map, or open a circle on a book you're reading."
        action={
          <Link href="/circles" className="btn-accent text-sm">
            Start a discussion
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col divide-y divide-line">
        {events.map((event) => {
          const href = event.conversation
            ? `/books/${event.book?.id ?? ""}/conversations/${event.conversation.id}`
            : "/circles";
          return (
            <li key={event.id} className="flex items-start gap-3 py-2.5">
              <Link href={`/users/${event.actor.id}`} className="shrink-0">
                <Avatar avatarId={event.actor.avatarId} name={event.actor.displayName} size={34} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  <Link
                    href={`/users/${event.actor.id}`}
                    className="font-semibold text-ink hover:text-accent-strong"
                  >
                    {event.actor.displayName}
                  </Link>{" "}
                  {verbOf(event)}{" "}
                  <Link
                    href={href}
                    className="font-semibold text-ink decoration-accent decoration-2 underline-offset-2 hover:underline"
                  >
                    {event.conversation?.title ?? "a circle"}
                  </Link>
                </p>
                {event.messageExcerpt ? (
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] italic text-ink-muted">
                    “{event.messageExcerpt}”
                  </p>
                ) : null}
                <p className="mt-0.5 text-[11px] font-medium text-ink-faint">{timeAgo(event.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/feed"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:text-accent"
      >
        <MessagesSquare size={13} /> Full activity <ArrowRight size={13} />
      </Link>
    </div>
  );
}