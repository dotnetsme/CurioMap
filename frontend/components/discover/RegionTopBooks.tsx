"use client";

import { BookCard } from "@/components/books/BookCard";
import type { TopBook } from "@/types";

export function RegionTopBooks({ books, regionLabel }: { books: TopBook[]; regionLabel?: string }) {
  if (books.length === 0) {
    return <div className="surface p-6 text-sm text-ink-faint">No reading activity here yet.</div>;
  }
  return (
    <div className="flex flex-col gap-3">
      {books.map((book, index) => (
        <BookCard
          key={book.id}
          book={book}
          footer={
            <span className="text-xs text-accent-ink">
              #{index + 1} — {book.readerCount} {book.readerCount === 1 ? "reader" : "readers"}{" "}
              {regionLabel ? `in ${regionLabel}` : ""}
            </span>
          }
        />
      ))}
    </div>
  );
}
