"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

/** Add a book to the signed-in reader's shelf or route a guest through auth. */
export function AddToBookshelf({ book }: { book: BookStub }) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<BookStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="rounded-xl border border-line bg-white/5 p-4 text-sm text-ink-muted">
        <p>
          Found the right book? Save it to your shelf after a quick account
          setup.
        </p>
        <Link
          href={`/auth/register?returnTo=${encodeURIComponent(`/books/${book.id}`)}`}
          className="mt-2 inline-flex font-medium text-ink underline decoration-accent decoration-2 underline-offset-2 hover:text-accent"
        >
          Create an account to add it
        </Link>
        <span className="mt-1 block text-xs text-ink-faint">
          Already a reader?{" "}
          <Link
            href={`/auth/login?returnTo=${encodeURIComponent(`/books/${book.id}`)}`}
            className="underline underline-offset-2"
          >
            Sign in
          </Link>
        </span>
      </div>
    );
  }

  async function addBook(status: BookStatus) {
    setBusy(status);
    setError(null);
    try {
      await bookshelfApi.add({ bookId: book.id, status, visibility: "public" });
      router.push("/me/bookshelf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add book");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white/5 p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted">
        ADD TO BOOKSHELF
      </p>
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button
            key={status.value}
            variant="ghost"
            disabled={busy !== null}
            onClick={() => void addBook(status.value)}
          >
            {busy === status.value ? "…" : status.label}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-heat-hot">{error}</p> : null}
    </div>
  );
}
