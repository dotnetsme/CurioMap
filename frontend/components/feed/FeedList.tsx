import { BookOpen, Flame, LibraryBig, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { BookCover } from "@/components/books/BookCover";
import { EmptyState } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import type { FeedEvent, BookStub } from "@/types";
import { timeAgo } from "@/lib/time";

function EventIcon({ type }: { type: string }) {
  const cls = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl";
  switch (type) {
    case "bookshelf_added":
      return (
        <span className={`${cls} bg-emerald-500/10 text-emerald-500`}>
          <BookOpen size={16} />
        </span>
      );
    case "conversation_created":
      return (
        <span className={`${cls} bg-violet-500/10 text-violet-500`}>
          <MessageCircle size={16} />
        </span>
      );
    case "message_posted":
      return (
        <span className={`${cls} bg-amber-500/10 text-amber-600`}>
          <Sparkles size={16} />
        </span>
      );
    default:
      return (
        <span className={`${cls} bg-surface-2 text-ink-3`}>
          <Flame size={16} />
        </span>
      );
  }
}

function describe(event: FeedEvent): React.ReactNode {
  const book = event.book?.title ? (
    <Link href={`/books/${event.book.id}`} className="font-semibold text-ink decoration-accent decoration-2 underline-offset-2 hover:underline">
      {event.book.title}
    </Link>
  ) : null;
  const conversation = event.conversation ? (
    <Link
      href={`/books/${event.book?.id ?? ""}/conversations/${event.conversation.id}`}
      className="font-semibold text-ink decoration-violet-400 decoration-2 underline-offset-2 hover:underline"
    >
      {event.conversation.title}
    </Link>
  ) : null;

  switch (event.type) {
    case "bookshelf_added":
      return (
        <>
          shelved <strong>{book}</strong>
          {event.shelfStatus && event.shelfStatus !== "reading" ? ` · marked ${event.shelfStatus}` : " · now reading"}
        </>
      );
    case "conversation_created":
      return <>opened a circle: <strong>{conversation}</strong></>;
    case "message_posted":
      return (
        <>
          replied in <strong>{conversation}</strong>
          {event.messageExcerpt ? <span className="text-ink-muted"> — “{event.messageExcerpt}”</span> : null}
        </>
      );
    default:
      return <>{event.type}</>;
  }
}

export function FeedList({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Your feed is quiet"
        hint="Follow readers you meet on the curiosity map to fill your feed."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event, i) => (
        <Reveal key={event.id} delay={Math.min(i, 6) * 0.05}>
          <article className="card card-hover p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Link href={`/users/${event.actor.id}`} className="shrink-0 transition hover:scale-105">
                <Avatar avatarId={event.actor.avatarId} name={event.actor.displayName} size={42} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-ink-2">
                  <Link href={`/users/${event.actor.id}`} className="font-semibold text-ink hover:text-accent">
                    {event.actor.displayName}
                  </Link>{" "}
                  {describe(event)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-ink-faint">{timeAgo(event.createdAt)}</p>
              </div>
              <EventIcon type={event.type} />
            </div>
            {event.book ? (
              <Link
                href={`/books/${event.book.id}`}
                className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-3 transition hover:border-ink-2"
              >
                <BookCover book={{ ...event.book, isbn: null, coverUrl: (event.book as { coverUrl?: string | null }).coverUrl ?? null } as BookStub} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{event.book.title}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                    <LibraryBig size={11} /> View book & circles →
                  </span>
                </span>
              </Link>
            ) : null}
          </article>
        </Reveal>
      ))}
    </div>
  );
}
