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
        loading="lazy"
        className="rounded-md object-cover"
        style={{ width: size, height: size * 1.5, boxShadow: "0 8px 20px -8px rgba(26,22,18,0.35)" }}
      />
    );
  }
  const hue = [...book.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 5;
  const palettes = [
    "from-amber-500 to-orange-700",
    "from-violet-500 to-indigo-700",
    "from-emerald-500 to-teal-700",
    "from-rose-500 to-red-700",
    "from-sky-500 to-blue-700",
  ];
  return (
    <div
      className={`flex items-center justify-center rounded-md bg-gradient-to-br p-1 text-center text-[10px] font-semibold leading-tight text-white/95 ${palettes[hue]}`}
      style={{ width: size, height: size * 1.5 }}
      aria-label={`Cover of ${book.title}`}
    >
      {book.title.slice(0, 32)}
    </div>
  );
}