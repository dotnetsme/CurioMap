import Link from "next/link";
import { Atom, BookOpen, Brain, Feather, Landmark, Sparkles } from "lucide-react";

const genres = [
  { label: "Fiction", query: "fiction", icon: BookOpen, tint: "text-rose-500 bg-rose-500/10" },
  { label: "History", query: "history", icon: Landmark, tint: "text-amber-600 bg-amber-500/10" },
  { label: "Science", query: "science", icon: Atom, tint: "text-cyan bg-cyan/10" },
  { label: "Fantasy", query: "fantasy", icon: Sparkles, tint: "text-violet bg-violet/10" },
  { label: "Philosophy", query: "philosophy", icon: Brain, tint: "text-accent-strong bg-accent-soft" },
  { label: "Poetry", query: "poetry", icon: Feather, tint: "text-reading bg-reading-soft" },
] as const;

/**
 * Genre shortcuts. These are catalog queries (`/books/search?q=…`), not a
 * fabricated taxonomy — CurioMap has no genre column in its schema.
 */
export function GenreChips() {
  return (
    <ul className="flex flex-wrap gap-2">
      {genres.map((g) => (
        <li key={g.label}>
          <Link
            href={`/books/search?q=${encodeURIComponent(g.query)}`}
            className="chip font-medium hover:border-ink-2"
          >
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${g.tint}`}>
              <g.icon size={13} />
            </span>
            {g.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}