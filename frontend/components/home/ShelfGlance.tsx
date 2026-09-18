"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { AddBookButton } from "@/components/bookshelf/AddBookButton";
import { BookCover } from "@/components/books/BookCover";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { Skeleton } from "@/components/ui/Skeleton";
import { myShelf } from "@/lib/api/bookshelf";
import type { BookshelfEntry } from "@/types";

const statusTone = { reading: "accent", finished: "reading", wishlist: "slate" } as const;

/** Dashboard glance at the signed-in reader's own shelf (includes their private rows). */
export function ShelfGlance() {
  const [entries, setEntries] = useState<BookshelfEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEntries(await myShelf());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your shelf");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} />;

  if (!entries) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-8 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Your shelf is empty"
        hint="Add a book to put your city on the curiosity map."
        action={<AddBookButton onAdded={() => void load()} />}
      />
    );
  }

  const reading = entries.filter((e) => e.status === "reading").slice(0, 3);
  const rest = [...entries.filter((e) => e.status === "wishlist"), ...entries.filter((e) => e.status === "finished")].slice(
    0,
    2,
  );
  const shown = [...reading, ...rest];

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col divide-y divide-line">
        {shown.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 py-2.5">
            <Link href={`/books/${entry.bookId}`} className="shrink-0">
              <BookCover book={entry.book} size={32} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/books/${entry.bookId}`}
                className="block truncate text-sm font-semibold text-ink hover:text-accent-strong"
              >
                {entry.book.title}
              </Link>
              <p className="truncate text-[11.5px] text-ink-faint">{entry.book.author}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone={statusTone[entry.status]}>{entry.status}</Badge>
              {entry.visibility === "private" ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-ink-3">
                  <Lock size={10} /> private
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/me/bookshelf"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:text-accent"
        >
          Open shelf <ArrowRight size={13} />
        </Link>
        <AddBookButton onAdded={() => void load()} />
      </div>
    </div>
  );
}