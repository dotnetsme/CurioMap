"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Compass,
  HelpCircle,
  MessageSquarePlus,
  Orbit,
  Quote,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import { create as createConversation } from "@/lib/api/conversations";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Conversation, TopicType } from "@/types";

const CURIOSITY_VECTORS = [
  "Philosophy",
  "Psychology",
  "Science & Nature",
  "History & Society",
  "Technology",
  "Sci-Fi",
  "Speculative & Magical",
  "Literary Fiction",
];

const PROMPTS: {
  key: string;
  label: string;
  topicType: TopicType;
  icon: typeof Sparkles;
}[] = [
  {
    key: "what_confused_you",
    label: "What confused you?",
    topicType: "question",
    icon: HelpCircle,
  },
  {
    key: "best_quote",
    label: "Best quote?",
    topicType: "general",
    icon: Quote,
  },
  {
    key: "who_should_read",
    label: "Who should read this?",
    topicType: "general",
    icon: Users,
  },
  {
    key: "changed_my_mind",
    label: "What changed your mind?",
    topicType: "theme",
    icon: Sparkles,
  },
  {
    key: "chapter_takeaways",
    label: "Chapter takeaways",
    topicType: "chapter",
    icon: BookOpen,
  },
  {
    key: "skeptic_corner",
    label: "Skeptic's corner",
    topicType: "question",
    icon: Compass,
  },
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
  const [topic, setTopic] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="card border-amber/30 bg-amber-soft/20 p-5 text-sm text-ink backdrop-blur-md">
        <p className="font-display text-base font-bold text-ink-strong">
          Join CurioMap to start a conversation
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          You can read discussions anytime, or create an anonymous identity to
          ask a question and share thoughts.
        </p>
        <Link
          href={`/auth/register?returnTo=${encodeURIComponent(`/books/${bookId}/conversations`)}`}
          className="btn-primary mt-4 inline-flex min-h-11 px-5 text-xs font-bold text-accent-ink"
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
        topic: topic.trim() || undefined,
      });
      setOpen(false);
      setTitle("");
      setTopic("");
      setPromptKey(null);
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
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 cursor-pointer"
      >
        <MessageSquarePlus size={16} /> Start a conversation
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card border-line-2/40 bg-stage-2/90 flex flex-col gap-4 p-5 backdrop-blur-md transition-all"
    >
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h3 className="font-display text-base font-bold text-ink-strong">
            New Book Discussion
          </h3>
          <p className="text-xs text-ink-muted">
            Share takeaways, questions, or ideas with readers worldwide.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-fill-2 hover:text-ink cursor-pointer transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Prompts */}
      <div>
        <label className="label-sm mb-2 block text-ink-muted">
          Conversation Prompts
        </label>
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => {
            const Icon = p.icon;
            const active = promptKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                className={`chip min-h-11 cursor-pointer px-3.5 py-2 text-xs transition-all duration-200 ${
                  active
                    ? "chip-active border-accent bg-accent/20 text-accent font-semibold"
                    : "hover:border-accent hover:text-ink"
                }`}
                onClick={() => {
                  setPromptKey(active ? null : p.key);
                  setTopicType(p.topicType);
                  if (!active) setTitle(p.label);
                }}
              >
                <Icon size={14} className={active ? "text-accent" : "text-ink-muted"} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curiosity Vector (Topic) */}
      <div>
        <label className="label-sm mb-2 inline-flex items-center gap-1.5 text-ink-muted">
          <Orbit size={12} className="text-accent" /> Curiosity Vector (Thematic category)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CURIOSITY_VECTORS.map((v) => {
            const selected = topic.toLowerCase() === v.toLowerCase();
            return (
              <button
                key={v}
                type="button"
                onClick={() => setTopic(selected ? "" : v)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                  selected
                    ? "border-accent bg-accent/25 text-accent font-semibold"
                    : "border-line bg-stage-3/60 text-ink-muted hover:border-line-2 hover:text-ink"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title & Scope */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Conversation title (3–200 chars)"
          required
          minLength={3}
          maxLength={200}
          className="text-base sm:text-sm min-h-11"
        />
        <Select
          value={topicType}
          onChange={(e) => setTopicType(e.target.value as TopicType)}
          className="min-h-11 sm:w-36 text-base sm:text-sm"
          aria-label="Discussion scope"
        >
          <option value="general">General</option>
          <option value="chapter">Chapter</option>
          <option value="theme">Theme</option>
          <option value="question">Question</option>
        </Select>
      </div>

      {error ? <p className="text-xs font-medium text-heat-hot">{error}</p> : null}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" isLoading={busy} className="min-h-11 px-5 text-sm font-semibold cursor-pointer">
          Create conversation
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="min-h-11 px-4 text-sm cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

