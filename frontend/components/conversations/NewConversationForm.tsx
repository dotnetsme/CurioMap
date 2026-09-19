"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import { create as createConversation } from "@/lib/api/conversations";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Conversation, TopicType } from "@/types";

const PROMPTS: { key: string; label: string; topicType: TopicType }[] = [
  {
    key: "what_confused_you",
    label: "What confused you?",
    topicType: "question",
  },
  { key: "best_quote", label: "Best quote?", topicType: "general" },
  {
    key: "who_should_read",
    label: "Who should read this?",
    topicType: "general",
  },
  {
    key: "changed_my_mind",
    label: "What changed your mind?",
    topicType: "theme",
  },
  {
    key: "chapter_takeaways",
    label: "Chapter takeaways",
    topicType: "chapter",
  },
  { key: "skeptic_corner", label: "Skeptic's corner", topicType: "question" },
];

export function NewConversationForm({
  bookId,
  onCreated,
}: {
  bookId: string;
  onCreated: (c: Conversation) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topicType, setTopicType] = useState<TopicType>("general");
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="card border-amber-300/30 bg-amber-50/70 p-4 text-sm text-ink-2">
        <p className="font-semibold text-ink">
          Join CurioMap to start a conversation.
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          You can read the discussion now, or create an anonymous identity to
          ask a question.
        </p>
        <Link
          href={`/auth/register?returnTo=${encodeURIComponent(`/books/${bookId}/conversations`)}`}
          className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-ink-2"
        >
          Join CurioMap
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const conversation = await createConversation(bookId, {
        title: title.trim(),
        topicType,
        promptKey: promptKey ?? undefined,
      });
      setOpen(false);
      setTitle("");
      onCreated(conversation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create conversation",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ Start a conversation</Button>
    );
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`chip ${promptKey === p.key ? "chip-active" : ""}`}
            onClick={() => {
              setPromptKey(promptKey === p.key ? null : p.key);
              setTopicType(p.topicType);
              if (promptKey !== p.key) setTitle(p.label);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Conversation title (3–200 chars)"
        required
        minLength={3}
        maxLength={200}
      />
      <Select
        value={topicType}
        onChange={(e) => setTopicType(e.target.value as TopicType)}
        className="w-40"
      >
        <option value="general">General</option>
        <option value="chapter">Chapter</option>
        <option value="theme">Theme</option>
        <option value="question">Question</option>
      </Select>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "…" : "Create"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
