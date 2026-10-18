"use client";

import { BookOpenCheck, LibraryBig, MessagesSquare, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookCover } from "@/components/books/BookCover";
import { BuyLinks } from "@/components/books/BuyLinks";
import { AddToBookshelf } from "@/components/bookshelf/AddToBookshelf";
import { ConversationList } from "@/components/conversations/ConversationList";
import { NewConversationForm } from "@/components/conversations/NewConversationForm";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { Stars } from "@/components/ui/Stars";
import { getBook } from "@/lib/api/books";
import { getRatingStats, rateBook } from "@/lib/api/books";
import { listForBook } from "@/lib/api/conversations";
import type { Book, Conversation } from "@/types";

const RATING_KEY = "curiomap:ratings";

function readRatings(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RATING_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function BookDetail({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"circles" | "about">("circles");
    const [rating, setRating] = useState(0);
  const [ratingStats, setRatingStats] = useState<{ average: number; count: number } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, c] = await Promise.all([getBook(bookId), listForBook(bookId)]);
      setBook(b);
      setConversations(c.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load book");
    }
  }, [bookId]);

      useEffect(() => {
    void load();
  }, [load]);

      const loadRating = useCallback(async () => {
    try {
      const stats = await getRatingStats(bookId);
      setRatingStats({ average: stats.average, count: stats.count });
      setRating(readRatings()[bookId] ?? 0);
    } catch {
      setRating(readRatings()[bookId] ?? 0);
    }
  }, [bookId]);

  useEffect(() => {
    void loadRating();
  }, [bookId, loadRating]);

    async function rate(v: number) {
    setRating(v);
    try {
      const stats = await rateBook(bookId, v);
      setRatingStats({ average: stats.average, count: stats.count });
    } catch {
      /* optimistic — stays in memory if offline */
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!book) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="night-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="shrink-0 transition duration-300 hover:-rotate-2 hover:scale-[1.03]">
              <BookCover book={book} size={150} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="label-sm text-signal/80">Book · {book.conversationsCount} circles</p>
              <h1 className="mt-1 display text-4xl text-ink-strong">
                {book.title}
              </h1>
              <p className="mt-1 text-[15px] text-ink-muted">by {book.author}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="flex items-center gap-2 rounded-full border border-line bg-fill px-3 py-1.5">
                                    <Stars value={rating} size={14} onRate={rate} />
                                    <span className="text-xs font-medium text-ink-muted">
                    {rating ? `You rated ${rating}/5` : "Rate it"}
                  </span>
                  {ratingStats ? (
                    <span className="ml-2 rounded-full bg-fill px-2 py-0.5 text-[10px] text-ink-faint">
                      {ratingStats.average.toFixed(2)} · {ratingStats.count} ratings
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <BookOpenCheck size={14} /> {book.readersCount} reading now
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {book.isbn ? <Badge tone="accent">ISBN {book.isbn}</Badge> : null}
                {book.metadata?.year ? <Badge tone="accent">{book.metadata.year}</Badge> : null}
                {Object.entries(book.metadata ?? {}).slice(0, 3).map(([k, v]) =>
                  k === "year" ? null : <Badge key={k} tone="accent">{v}</Badge>,
                )}
              </div>
              {book.description ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">{book.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-sm font-semibold">
              <button
                onClick={() => setTab("circles")}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 transition ${tab === "circles" ? "bg-accent text-accent-ink shadow" : "text-ink-faint hover:text-ink"}`}
              >
                <MessagesSquare size={14} /> Circles ({conversations.length})
              </button>
              <button
                onClick={() => setTab("about")}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 transition ${tab === "about" ? "bg-accent text-accent-ink shadow" : "text-ink-faint hover:text-ink"}`}
              >
                <LibraryBig size={14} /> About
              </button>
            </div>
            {tab === "circles" ? (
              <NewConversationForm
                bookId={book.id}
                onCreated={(c) => setConversations((prev) => [c, ...prev])}
              />
            ) : null}
          </div>
          {tab === "circles" ? (
            <ConversationList conversations={conversations} />
          ) : (
            <div className="card flex flex-col gap-3 p-6 text-sm leading-relaxed text-ink-muted">
              <p>
                <Star size={14} className="mr-1 inline text-amber-500" />
                Community ratings and reader reviews sync live to CurioMap&apos;s ethical reading graph.
              </p>
              {book.description ? <p>{book.description}</p> : <p>No publisher description yet.</p>}
              <p className="text-xs text-ink-faint">
                Your reading status stays private unless you set the entry (or your whole shelf) to public in{" "}
                <Link href="/me/settings" className="underline decoration-accent decoration-2 underline-offset-2 hover:text-accent">
                  settings
                </Link>
                .
              </p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <AddToBookshelf book={book} />
          <BuyLinks links={book.affiliateLinks} />
          <div className="card p-4 text-xs leading-relaxed text-ink-muted">
            <p className="label-sm mb-1 text-ink-faint">Privacy note</p>
            Your reading status is public only if you set the entry (or your whole shelf) to
            public. Manage this in{" "}
            <Link href="/me/settings" className="underline decoration-accent decoration-2 underline-offset-2 hover:text-accent">
              settings
            </Link>
            .
          </div>
        </aside>
      </div>
    </div>
  );
}
