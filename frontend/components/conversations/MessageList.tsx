"use client";

import { useState } from "react";
import { Avatar } from "@/components/profile/Avatar";
import { timeAgo } from "@/lib/time";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { react as reactApi, unreact as unreactApi, report as reportApi } from "@/lib/api/messages";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Message, ReactionKind } from "@/types";

const kinds: { kind: ReactionKind; label: string }[] = [
  { kind: "insightful", label: "Insightful" },
  { kind: "funny", label: "Funny" },
  { kind: "helpful", label: "Helpful" },
];

function MessageRow({ message, onReact }: { message: Message; onReact?: (m: Message) => void }) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(kind: ReactionKind, reactedByMe: boolean) {
    try {
      if (reactedByMe) {
        await unreactApi(message.id, kind);
      } else {
        await reactApi(message.id, kind);
      }
      onReact?.(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reaction failed");
    }
  }

  async function submitReport() {
    try {
      await reportApi(message.id, reason);
      setReported(true);
      setReportOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed");
      setReportOpen(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Avatar avatarId={message.author.avatarId} name={message.author.displayName} size={28} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{message.author.displayName}</p>
          <p className="text-[11px] text-ink-faint">
                        {timeAgo(message.createdAt)}
          </p>
        </div>
        {user && user.id !== message.author.id ? (
          <button
            onClick={() => setReportOpen(true)}
            className="ml-auto cursor-pointer text-xs text-ink-faint hover:text-heat-hot"
          >
            Report
          </button>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{message.content}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kinds.map(({ kind, label }) => {
          const summary = message.reactions.find((r) => r.kind === kind);
          const active = summary?.reactedByMe ?? false;
          return (
            <button
              key={kind}
              onClick={() => void toggle(kind, active)}
              className={`chip ${active ? "chip-active" : ""}`}
              disabled={!user}
            >
              {label}
              {summary && summary.count > 0 ? ` ${summary.count}` : ""}
            </button>
          );
        })}
        {reported ? <Badge tone="reading">reported — thank you</Badge> : null}
        {error ? <span className="text-xs text-heat-hot">{error}</span> : null}
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this message">
        {reported ? (
          <p className="text-sm text-reading">Thanks — a moderator will review it.</p>
        ) : (
          <>
            <textarea
              className="field min-h-24"
              placeholder="Why are you reporting this? (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="danger"
                disabled={reason.trim().length < 3}
                onClick={() => void submitReport()}
              >
                Submit report
              </Button>
              <Button variant="ghost" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export function MessageList({
  messages,
  onChanged,
}: {
  messages: Message[];
  onChanged?: () => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="card p-6 text-sm text-ink-faint">
        No messages yet. Be the first to share a thought.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} onReact={onChanged ? () => onChanged() : undefined} />
      ))}
    </div>
  );
}

export { MessageRow };
