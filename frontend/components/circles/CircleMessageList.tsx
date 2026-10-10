"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/profile/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/Feedback";
import { timeAgo } from "@/lib/time";
import {
  listCircleMessages,
  postCircleMessage,
  reactToCircleMessage,
} from "@/lib/api/circles";
import type { CircleMessage, ReactionSummary } from "@/types";

// Reaction chips are plain-text labels, mirroring conversations/MessageList.
// Icons here would imply emoji reactions, which the domain forbids
// (ReactionKind is strictly insightful | funny | helpful).
const REACTIONS: { kind: string; label: string }[] = [
  { kind: "insightful", label: "Insightful" },
  { kind: "funny", label: "Funny" },
  { kind: "helpful", label: "Helpful" },
];

export function CircleMessageList({
  handle,
  canPost,
}: {
  handle: string;
  canPost: boolean;
}) {
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const page = await listCircleMessages(handle);
      setMessages(page.items.reverse());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [handle]);

  useEffect(() => {
    load().then(() => {
      bottomRef.current?.scrollIntoView();
    });
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setBusy(true);
    setContent("");
    try {
      const msg = await postCircleMessage(handle, text);
      setMessages((prev) => [...prev, msg]);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setContent(text);
    } finally {
      setBusy(false);
    }
  }

  async function react(messageId: string, kind: string) {
    try {
      const result = await reactToCircleMessage(handle, messageId, kind);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: result.reactions as ReactionSummary[] }
            : m,
        ),
      );
    } catch {
      // silent fail on reaction
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <EmptyState title="Could not load messages" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-3">
            No messages yet. Be the first to share your thoughts!
          </p>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <Avatar avatarId={msg.author.avatarId} name={msg.author.displayName} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {msg.author.displayName}
                  </span>
                  <span className="text-xs text-ink-3">{timeAgo(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-ink-2">{msg.content}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {REACTIONS.map((r) => {
                    const reacted = msg.reactions?.find((x) => x.kind === r.kind);
                    return (
                      <button
                        key={r.kind}
                        onClick={() => canPost && react(msg.id, r.kind)}
                        disabled={!canPost}
                        className={`flex min-h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-accent ${
                          reacted?.reactedByMe
                            ? "border-accent bg-accent/15 text-accent font-semibold"
                            : "border-line bg-stage-2 text-ink-muted hover:border-accent/50 hover:text-accent"
                        } ${!canPost ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {r.label}
                        {reacted ? <span className="font-medium">{reacted.count}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {canPost ? (
        <form onSubmit={send} className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts…"
            maxLength={2000}
            className="text-base sm:text-sm min-h-11"
          />
          <Button
            type="submit"
            disabled={busy || !content.trim()}
            isLoading={busy}
            className="min-h-11 min-w-11 shrink-0 cursor-pointer"
            aria-label="Send message to circle"
          >
            <Send size={16} />
          </Button>
        </form>
      ) : (
        <p className="text-center text-sm text-ink-3">
          Join the circle to post messages.
        </p>
      )}
    </div>
  );
}
