"use client";

import { useState } from "react";
import * as bookshelfApi from "@/lib/api/bookshelf";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import type { BookStatus, BookStub } from "@/types";

const statuses: { value: BookStatus; label: string }[] = [
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
  { value: "wishlist", label: "Wishlist" },
];

/**
 * Add a book to the signed-in reader's shelf. Inline status choice;
 * prompts to sign in when logged out.
 */
export function AddToBookshelf({ book }: { book: BookStub }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<BookStatus | null>(null);
  const [done, setDone] = useState<BookStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="rounded border border-ink/10 bg-white p-4 text-sm text-ink-soft">
        <a href="/auth/login" className="font-medium text-ink underline decoration-accent decoration-2 underline-offset-2 hover:text-accent">
          Sign in
        </a>{" "}
        to add &ldquo;{book.title}&rdquo; to your bookshelf.
      </div>
    );
  }

  async function addBook(status: BookStatus) {
    setBusy(status);
    setError(null);
    try {
      await bookshelfApi.add({ bookId: book.id, status, visibility: "public" });
      setDone(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add book");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div className="rounded border border-ink/10 bg-white p-4 text-sm text-green-700">
        On your shelf as &ldquo;{done}&rdquo;.{" "}
        <a href="/me/bookshelf" className="underline decoration-accent decoration-2 underline-offset-2 hover:text-accent">
          Manage
        </a>
      </div>
    );
  }

  return (
    <div className="rounded border border-ink/10 bg-white p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">ADD TO BOOKSHELF</p>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Button
            key={s.value}
            variant="ghost"
            disabled={busy !== null}
            onClick={() => void addBook(s.value)}
          >
            {busy === s.value ? "…" : s.label}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
