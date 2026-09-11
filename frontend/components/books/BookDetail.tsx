"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookCover } from "@/components/books/BookCard";
import { BuyLinks } from "@/components/books/BuyLinks";
import { AddToBookshelf } from "@/components/bookshelf/AddToBookshelf";
import { ConversationList } from "@/components/conversations/ConversationList";
import { NewConversationForm } from "@/components/conversations/NewConversationForm";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { getBook } from "@/lib/api/books";
import { listForBook } from "@/lib/api/conversations";
import type { Book, Conversation } from "@/types";

export function BookDetail({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([getBook(bookId), listForBook(bookId)]);
      setBook(b);
      setConversations(c.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load book");
    }
  }, [bookId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs after `await` in load()
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} />;
  if (!book) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass flex flex-col gap-5 p-6 sm:flex-row">
        <div className="shrink-0">
          <BookCover book={book} size={140} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white">{book.title}</h1>
          <p className="text-slate-300">{book.author}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            {book.isbn ? <Badge tone="slate">ISBN {book.isbn}</Badge> : null}
            <Badge tone="cyan">{book.readersCount} reading</Badge>
            <Badge tone="violet">{book.conversationsCount} conversations</Badge>
            {book.metadata?.year ? <Badge tone="amber">{book.metadata.year}</Badge> : null}
          </div>
          {book.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{book.description}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Conversations</h2>
            <NewConversationForm
              bookId={book.id}
              onCreated={(c) => setConversations((prev) => [c, ...prev])}
            />
          </div>
          <ConversationList conversations={conversations} />
        </section>

        <aside className="flex flex-col gap-4">
          <AddToBookshelf book={book} />
          <BuyLinks links={book.affiliateLinks} />
          <div className="glass p-4 text-xs text-slate-400">
            <p className="mb-1 font-semibold text-slate-300">PRIVACY NOTE</p>
            Your reading status is public only if you set the entry (or your whole shelf) to
            public. Manage this in{" "}
            <Link href="/me/settings" className="underline hover:text-slate-200">
              settings
            </Link>
            .
          </div>
        </aside>
      </div>
    </div>
  );
}
