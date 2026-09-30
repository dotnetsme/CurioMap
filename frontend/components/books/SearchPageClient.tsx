"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
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
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong">Search books</h1>
        <p className="mt-1 text-sm text-ink-muted">Find books and discover who is reading them around the world.</p>
      </div>
      <BookSearchBar initialQuery={query} />
      {fromExternal ? (
        <div className="flex items-center justify-between rounded-xl border border-signal/30 bg-signal/10 px-4 py-2.5 text-xs text-ink-muted">
          <span>No exact local catalog match — imported live from Open Library.</span>
          <button
            type="button"
            className="cursor-pointer font-semibold text-signal hover:underline"
            onClick={() => setFromExternal(false)}
          >
            Acknowledge
          </button>
        </div>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {query.trim().length < 2 ? (
        <EmptyState
          icon={BookOpen}
          title="Search the catalog"
          hint="Try a title, author, or ISBN — like “Meditations”, “Harari”, or 9780140449334"
        />
      ) : loading ? (
        <PageLoading />
      ) : !results || results.items.length === 0 ? (
        <EmptyState icon={BookOpen} title="No books found" hint="Try different keywords or an ISBN." />
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