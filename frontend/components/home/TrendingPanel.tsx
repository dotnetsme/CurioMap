import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { EmptyState } from "@/components/ui/Feedback";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TopBook } from "@/types";

/** Compact 3-up trending grid for the dashboard sidebar (rails live on /discover). */
export function TrendingPanel({ books, loading = false }: { books: TopBook[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-[126px] w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <EmptyState
        title="No trending books yet"
        hint="Trending fills up as readers shelve titles in your area."
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {books.slice(0, 3).map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.id}`}
            className="group flex min-w-0 flex-col items-center text-center"
          >
            <span className="block overflow-hidden rounded-md transition duration-300 group-hover:scale-[1.04]">
              <BookCover book={book} size={84} />
            </span>
            <span className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink group-hover:text-accent-strong">
              {book.title}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink-faint">
              <Users size={11} /> {book.readerCount} reading
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/discover/top-books"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:text-accent"
      >
        Full leaderboard <ArrowRight size={13} />
      </Link>
    </div>
  );
}