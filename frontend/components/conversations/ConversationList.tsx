"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/profile/Avatar";
import type { Conversation } from "@/types";

const topicTones: Record<string, string> = {
  general: "violet",
  chapter: "cyan",
  theme: "accent",
  question: "reading",
};

export function ConversationCard({ conversation }: { conversation: Conversation }) {
  const base = conversation.bookId ? `/books/${conversation.bookId}` : "";
  const href = `${base}/conversations/${conversation.id}`;

  return (
    <div className="card card-hover p-4">
      <div className="flex items-center gap-2">
        <Badge tone={topicTones[conversation.topicType] ?? "slate"}>{conversation.topicType}</Badge>
        {conversation.isArchived ? <Badge tone="slate">archived</Badge> : null}
        <span className="ml-auto text-xs text-ink-3">
          {conversation.messageCount} {conversation.messageCount === 1 ? "message" : "messages"}
        </span>
      </div>
      <Link href={href} className="mt-2 block text-lg font-semibold text-ink hover:text-accent">
        {conversation.title}
      </Link>
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        <Avatar avatarId={conversation.createdBy.avatarId} name={conversation.createdBy.displayName} size={22} />
        <span>{conversation.createdBy.displayName}</span>
        <span aria-hidden>·</span>
        <span>{new Date(conversation.lastActivityAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return (
      <div className="card p-6 text-sm text-ink-3">
        No conversations yet. Start the first one — short threads work best.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {conversations.map((c) => (
        <ConversationCard key={c.id} conversation={c} />
      ))}
    </div>
  );
}
