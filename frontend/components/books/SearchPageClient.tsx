"use client";

import { useEffect, useState } from "react";
import { BookCard } from "@/components/books/BookCard";
import { BookSearchBar } from "@/components/books/BookSearchBar";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/Feedback";
import { search } from "@/lib/api/books";
import type { Book } from "@/types";

export function SearchPageClient({ initialQuery }: { initialQuery: string }) {
  const query = initialQuery;
  const [results, setResults] = useState<{ query: string; items: Book[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromExternal, setFromExternal] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const active = query.trim();
    (async () => {
      try {
        const r = await search(active, 24);
        if (!cancelled) {
          setResults({ query: active, items: r.items });
          setFromExternal(r.fromExternal);
        }
      } catch (e) {
        if (!cancelled && query.trim() === active) {
          setError(e instanceof Error ? e.message : "Search failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const loading = results ? results.query !== query.trim() : query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-2xl font-bold text-white">Search books</h1>
      <BookSearchBar initialQuery={query} />
      {fromExternal ? (
        <p className="text-xs text-slate-500">
          No exact catalog match — we imported these results from Open Library.{" "}
          <button
            type="button"
            className="text-cyan-300 underline hover:text-cyan-200"
            onClick={() => setFromExternal(false)}
          >
            Acknowledge
          </button>
        </p>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {query.trim().length < 2 ? (
        <EmptyState
          title="Search the catalog"
          hint="Try a title, author, or ISBN — like “Meditations”, “Harari”, or 9780140449334"
        />
      ) : loading ? (
        <PageLoading />
      ) : !results || results.items.length === 0 ? (
        <EmptyState title="No books found" hint="Try different keywords or an ISBN." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.items.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}