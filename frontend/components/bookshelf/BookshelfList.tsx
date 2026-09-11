"use client";

import { useCallback, useEffect, useState } from "react";
import { AddBookButton } from "./AddBookButton";
import { BookshelfEntryCard } from "./BookshelfEntryCard";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/Feedback";
import { myShelf, publicShelf } from "@/lib/api/bookshelf";
import type { BookshelfEntry } from "@/types";

export function BookshelfList({ ownerId }: { ownerId?: string }) {
  const [entries, setEntries] = useState<BookshelfEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editable = !ownerId;

  const load = useCallback(async () => {
    try {
      setEntries(ownerId ? await publicShelf(ownerId) : await myShelf());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookshelf");
    }
  }, [ownerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs after `await` in load()
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} />;
  if (!entries) return <PageLoading />;

  const grouped = {
    reading: entries.filter((e) => e.status === "reading"),
    finished: entries.filter((e) => e.status === "finished"),
    wishlist: entries.filter((e) => e.status === "wishlist"),
  };

  return (
    <div className="flex flex-col gap-6">
      {editable ? (
        <div className="flex justify-end">
          <AddBookButton onAdded={() => void load()} />
        </div>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          title="This bookshelf is empty"
          hint={editable ? "Add your first book to light up the map." : undefined}
        />
      ) : (
        (["reading", "finished", "wishlist"] as const).map((shelf) =>
          grouped[shelf].length > 0 ? (
            <section key={shelf}>
              <h3 className="mb-2 text-xs font-semibold tracking-widest text-slate-400">
                {shelf.toUpperCase()} ({grouped[shelf].length})
              </h3>
              <div className="flex flex-col gap-3">
                {grouped[shelf].map((entry) => (
                  <BookshelfEntryCard
                    key={entry.id}
                    entry={entry}
                    editable={editable}
                    onChanged={() => void load()}
                  />
                ))}
              </div>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
