"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookCard } from "./BookCard";
import type { Book, BookStub, TopBook } from "@/types";

function toStub(b: TopBook | BookStub | Book): BookStub & { readerCount?: number } {
  return { ...b, readerCount: "readerCount" in b ? b.readerCount : undefined };
}

export function TopBooksRail({ books }: { books: (TopBook | BookStub | Book)[] }) {
  const [ref, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    if (!api) return;
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api, update]);

  return (
    <div className="relative">
      <div ref={ref} className="embla -mx-1 px-1">
        <div className="embla__container py-2">
          {books.map((b, i) => (
            <article key={b.id} className="embla__slide w-[240px] sm:w-[264px]">
              <div className="relative">
                <span className="pointer-events-none absolute -left-1 -top-4 z-10 font-display text-5xl font-bold text-ink/10">
                  {i + 1}
                </span>
                <BookCard book={toStub(b)} rank={i + 1} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Link href="/discover/top-books" className="text-sm font-semibold text-accent-strong hover:text-accent">
          Full leaderboard →
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => api?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Scroll back"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-ink-2 disabled:opacity-30"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => api?.scrollNext()}
            disabled={!canNext}
            aria-label="Scroll forward"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-ink-2 disabled:opacity-30"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
