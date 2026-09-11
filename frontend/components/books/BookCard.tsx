import { Flame, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/books/BookCover";
import type { Book, BookStub } from "@/types";

export function BookCard({
  book,
  footer,
  rank,
}: {
  book: (BookStub | Book) & { readerCount?: number };
  footer?: React.ReactNode;
  rank?: number;
}) {
  const readers =
    "readerCount" in book && book.readerCount
      ? book.readerCount
      : "readersCount" in book
        ? book.readersCount
        : 0;
  const conversations = "conversationsCount" in book ? book.conversationsCount : 0;
  return (
    <div className="card card-hover group flex h-full gap-4 p-4">
      <Link href={`/books/${book.id}`} className="relative shrink-0 overflow-hidden rounded-md">
        <span className="block transition duration-300 group-hover:scale-[1.04] group-hover:-rotate-1">
          <BookCover book={book} size={64} />
        </span>
        {rank && rank <= 3 ? (
          <span className="absolute left-1 top-1 rounded-full bg-ink/85 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
            #{rank}
          </span>
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/books/${book.id}`}
          className="line-clamp-2 font-semibold leading-snug text-ink decoration-accent decoration-2 underline-offset-2 hover:underline"
        >
          {book.title}
        </Link>
        <p className="mt-0.5 truncate text-sm text-ink-3">{book.author}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
          {readers > 0 ? (
            <span className="inline-flex items-center gap-1 text-accent-strong">
              <Flame size={12} /> {readers} reading
            </span>
          ) : null}
          {conversations > 0 ? (
            <span className="inline-flex items-center gap-1 text-ink-faint">
              <MessagesSquare size={12} /> {conversations}
            </span>
          ) : null}
        </div>
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
