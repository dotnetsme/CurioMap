import Link from "next/link";
import type { Book, BookStub } from "@/types";

export function BookCover({ book, size = 56 }: { book: BookStub | Book; size?: number }) {
  if (book.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.coverUrl}
        alt={`Cover of ${book.title}`}
        width={size}
        height={size * 1.5}
        className="rounded-md object-cover"
        style={{ width: size, height: size * 1.5, boxShadow: "0 2px 8px -2px rgba(26,22,18,0.18)" }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-md bg-gradient-to-br from-accent/80 to-accent-strong text-center text-[10px] font-semibold text-white/90"
      style={{ width: size, height: size * 1.5 }}
    >
      {book.title.slice(0, 24)}
    </div>
  );
}

export function BookCard({ book, footer }: { book: BookStub | Book; footer?: React.ReactNode }) {
  return (
    <div className="card card-hover flex gap-4 p-4">
      <Link href={`/books/${book.id}`} className="shrink-0">
        <BookCover book={book} size={56} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/books/${book.id}`} className="font-semibold text-ink hover:text-accent">
          {book.title}
        </Link>
        <p className="text-sm text-ink-3">{book.author}</p>
        {book.isbn ? <p className="mt-1 text-[11px] text-ink-3">ISBN {book.isbn}</p> : null}
        {"readersCount" in book && book.readersCount > 0 ? (
          <p className="mt-1 text-[11px] text-reading">{book.readersCount} reading now</p>
        ) : null}
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
