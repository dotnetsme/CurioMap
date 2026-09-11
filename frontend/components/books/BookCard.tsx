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
        className="rounded-md object-cover shadow"
        style={{ width: size, height: size * 1.5 }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-md bg-gradient-to-br from-violet-600/60 to-cyan-600/50 text-center text-[10px] font-semibold text-white/90"
      style={{ width: size, height: size * 1.5 }}
    >
      {book.title.slice(0, 24)}
    </div>
  );
}

export function BookCard({ book, footer }: { book: BookStub | Book; footer?: React.ReactNode }) {
  return (
    <div className="glass glass-hover flex gap-4 p-4">
      <Link href={`/books/${book.id}`} className="shrink-0">
        <BookCover book={book} size={56} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/books/${book.id}`} className="font-semibold text-white hover:text-violet-200">
          {book.title}
        </Link>
        <p className="text-sm text-slate-400">{book.author}</p>
        {book.isbn ? <p className="mt-1 text-[11px] text-slate-500">ISBN {book.isbn}</p> : null}
        {"readersCount" in book && book.readersCount > 0 ? (
          <p className="mt-1 text-[11px] text-cyan-300/80">{book.readersCount} reading now</p>
        ) : null}
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
