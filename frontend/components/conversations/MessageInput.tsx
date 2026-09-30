"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { postMessage } from "@/lib/api/conversations";
import { useAuth } from "@/components/providers/AuthProvider";
import { ApiError } from "@/lib/api/http";

export function MessageInput({
  conversationId,
  onPosted,
}: {
  conversationId: string;
  onPosted: () => void;
}) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="card p-4 text-sm text-ink-2">
        <Link href="/auth/login" className="text-accent hover:text-accent-strong underline">
          Sign in
        </Link>{" "}
        to join this conversation.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = content.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await postMessage(conversationId, value);
      setContent("");
      onPosted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-2 p-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a thought… (short and focused works best)"
        maxLength={2000}
        required
      />
      {error ? <p className="text-sm text-heat-hot">{error}</p> : null}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-faint">{content.length}/2000</span>
        <Button type="submit" isLoading={busy} disabled={!content.trim()}>
          Post
        </Button>
      </div>
    </form>
  );
}
