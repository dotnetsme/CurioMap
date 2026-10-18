"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookCover } from "@/components/books/BookCover";
import { ConversationList } from "@/components/conversations/ConversationList";
import { NewConversationForm } from "@/components/conversations/NewConversationForm";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { getBook } from "@/lib/api/books";
import { listForBook } from "@/lib/api/conversations";
import type { Book, Conversation } from "@/types";

export default function BookConversationsPage({ params }: { params: Promise<{ id: string }> }) {
  const [book, setBook] = useState<Book | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    try {
      const [b, c] = await Promise.all([getBook(id), listForBook(id)]);
      setBook(b);
      setConversations(c.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    }
  }, []);

  useEffect(() => {
    void params.then(({ id }) => {
      setBookId(id);
      void load(id);
    });
  }, [params, load]);

  if (error) return <ErrorState message={error} />;
  if (!book || !bookId) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="glass flex items-center gap-4 p-4">
        <BookCover book={book} size={56} />
        <div className="min-w-0 flex-1">
          <p className="label-sm text-ink-faint">Discussions on</p>
          <Link href={`/books/${book.id}`} className="text-lg font-semibold text-ink hover:text-accent-strong">
            {book.title}
          </Link>
          <p className="text-sm text-ink-muted">{book.author}</p>
        </div>
      </div>
      <NewConversationForm bookId={book.id} onCreated={(c) => setConversations((prev) => [c, ...prev])} />
      <ConversationList conversations={conversations} />
    </div>
  );
}