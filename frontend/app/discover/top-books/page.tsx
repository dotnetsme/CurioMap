"use client";

import { useEffect, useState } from "react";
import { RegionTopBooks } from "@/components/discover/RegionTopBooks";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { topBooks } from "@/lib/api/discover";
import type { TopBook } from "@/types";

export default function TopBooksPage() {
  const [books, setBooks] = useState<TopBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setBooks((await topBooks()).books);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load top books");
      }
    })();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!books) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="display text-4xl text-ink-strong sm:text-5xl">Top books being read</h1>
      <p className="text-sm text-ink-muted">
        Ranked by public “reading” status across every region that lights up the map.
      </p>
      <RegionTopBooks books={books} />
    </div>
  );
}