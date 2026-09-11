"use client";

import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { EmptyState } from "@/components/ui/Feedback";
import type { FeedEvent } from "@/types";

function describe(event: FeedEvent): { icon: string; text: React.ReactNode } {
  const book = event.book?.title ? (
    <Link href={`/books/${event.book.id}`} className="text-violet-300 hover:text-violet-200">
      {event.book.title}
    </Link>
  ) : null;
  const conversation = event.conversation ? (
    <Link
      href={`/books/${event.book?.id ?? ""}/conversations/${event.conversation.id}`}
      className="text-cyan-300 hover:text-cyan-200"
    >
      {event.conversation.title}
    </Link>
  ) : null;

  switch (event.type) {
    case "bookshelf_added":
      return {
        icon: "📚",
        text: (
          <>
            started reading <strong>{book}</strong>
            {event.shelfStatus && event.shelfStatus !== "reading" ? ` (${event.shelfStatus})` : ""}
          </>
        ),
      };
    case "conversation_created":
      return { icon: "💬", text: <>opened a conversation: <strong>{conversation}</strong></> };
    case "message_posted":
      return {
        icon: "✍️",
        text: (
          <>
            replied in <strong>{conversation}</strong> — “{event.messageExcerpt}”
          </>
        ),
      };
    default:
      return { icon: "✨", text: <>{event.type}</> };
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
      {events.map((event) => {
        const { icon, text } = describe(event);
        return (
          <div key={event.id} className="glass flex items-start gap-3 p-4">
            <Avatar avatarId={event.actor.avatarId} name={event.actor.displayName} size={36} />
            <div className="min-w-0 text-sm">
              <p className="text-slate-200">
                <Link href={`/users/${event.actor.id}`} className="font-medium text-white hover:text-violet-200">
                  {event.actor.displayName}
                </Link>{" "}
                {text}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
            <span className="ml-auto text-lg">{icon}</span>
          </div>
        );
      })}
    </div>
  );
}
