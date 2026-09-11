"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { BookCard } from "@/components/books/BookCard";
import { search as searchBooks } from "@/lib/api/books";
import { add as addToShelf } from "@/lib/api/bookshelf";
import type { Book } from "@/types";

/** Search Open Library + the local catalog, then add the picked book to the shelf. */
export function AddBookButton({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const r = await searchBooks(query.trim(), 12);
      setResults(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function pick(bookId: string) {
    setAdding(bookId);
    setError(null);
    try {
      await addToShelf({ bookId, status: "reading", visibility: "public" });
      setOpen(false);
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add book</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a book to your shelf">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
          className="mb-4 flex gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, author, or ISBN…"
            autoFocus
          />
          <Button type="submit" disabled={searching}>
            {searching ? "…" : "Find"}
          </Button>
        </form>
        {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
        <div className="flex flex-col gap-3">
          {results.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              footer={
                <Button variant="ghost" onClick={() => void pick(book.id)} disabled={adding !== null}>
                  {adding === book.id ? "Adding…" : "Add as reading"}
                </Button>
              }
            />
          ))}
          {results.length === 0 && !searching && query ? (
            <p className="text-sm text-slate-400">No results yet — run a search.</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
