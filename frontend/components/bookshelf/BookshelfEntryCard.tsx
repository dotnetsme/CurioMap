"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { remove as removeEntry, update as updateEntry } from "@/lib/api/bookshelf";
import { BookCover } from "@/components/books/BookCover";
import type { BookshelfEntry, BookStatus, ShelfVisibility } from "@/types";

export function BookshelfEntryCard({
  entry,
  editable,
  onChanged,
}: {
  entry: BookshelfEntry;
  editable?: boolean;
  onChanged?: () => void;
}) {
  const [status, setStatus] = useState<BookStatus>(entry.status);
  const [visibility, setVisibility] = useState<ShelfVisibility>(entry.visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(nextStatus: BookStatus, nextVisibility: ShelfVisibility) {
    setSaving(true);
    setError(null);
    try {
      await updateEntry(entry.id, { status: nextStatus, visibility: nextVisibility });
      setStatus(nextStatus);
      setVisibility(nextVisibility);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeBook() {
    setSaving(true);
    setError(null);
    try {
      await removeEntry(entry.id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-white/5 p-4 transition hover:border-line-2">
      <a href={`/books/${entry.bookId}`} className="shrink-0">
        <BookCover book={entry.book} size={48} />
      </a>
      <div className="min-w-0 flex-1">
        <a href={`/books/${entry.bookId}`} className="font-medium text-ink hover:text-accent">
          {entry.book.title}
        </a>
        <p className="text-sm text-ink-muted">{entry.book.author}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge tone={status === "reading" ? "accent" : status === "finished" ? "reading" : "slate"}>
            {status}
          </Badge>
          <Badge tone={visibility === "public" ? "accent" : "slate"}>{visibility}</Badge>
        </div>
        {error ? <p className="mt-1 text-xs text-heat-hot">{error}</p> : null}
      </div>
      {editable ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Select
            value={status}
            disabled={saving}
            onChange={(e) => void apply(e.target.value as BookStatus, visibility)}
            className="w-32"
            aria-label="Status"
          >
            <option value="reading">Reading</option>
            <option value="finished">Finished</option>
            <option value="wishlist">Wishlist</option>
          </Select>
          <Select
            value={visibility}
            disabled={saving}
            onChange={(e) => void apply(status, e.target.value as ShelfVisibility)}
            className="w-28"
            aria-label="Visibility"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </Select>
          <Button variant="subtle" onClick={() => void removeBook()} disabled={saving}>
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
