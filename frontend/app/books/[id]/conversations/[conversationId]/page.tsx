"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageList } from "@/components/conversations/MessageList";
import { MessageInput } from "@/components/conversations/MessageInput";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { get } from "@/lib/api/conversations";
import { listMessages } from "@/lib/api/conversations";
import type { Conversation, Message } from "@/types";

export default function ConversationThreadPage({ params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (conversationId: string) => {
    try {
      const [c, m] = await Promise.all([get(conversationId), listMessages(conversationId)]);
      setConversation(c);
      setMessages(m.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    }
  }, []);

  useEffect(() => {
    void params.then(({ conversationId }) => void load(conversationId));
  }, [params, load]);

  if (error) return <ErrorState message={error} />;
  if (!conversation) return <PageLoading />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 py-4">
      <div>
        <p className="text-xs text-slate-500">
          {conversation.book ? (
            <>
              in{" "}
              <Link
                href={`/books/${conversation.book.id}`}
                className="text-slate-300 underline hover:text-slate-200"
              >
                {conversation.book.title}
              </Link>
            </>
          ) : null}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">{conversation.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="violet">{conversation.topicType}</Badge>
          {conversation.isArchived ? <Badge tone="slate">archived — read only</Badge> : null}
          <span className="text-xs text-slate-500">
            started by {conversation.createdBy.displayName}
          </span>
        </div>
      </div>

      <MessageList messages={messages} onChanged={() => void load(conversation.id)} />

      {conversation.isArchived ? (
        <div className="glass p-4 text-sm text-slate-400">
          This thread is archived after {""}30 days of quiet. Start a fresh one for fresh energy.
        </div>
      ) : (
        <MessageInput conversationId={conversation.id} onPosted={() => void load(conversation.id)} />
      )}
    </div>
  );
}