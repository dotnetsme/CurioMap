import Link from "next/link";
import { Atom, BookOpen, Brain, Feather, Landmark, Sparkles } from "lucide-react";

const genres = [
  { label: "Fiction", query: "fiction", icon: BookOpen, tint: "text-heat-hot bg-heat-hot/10" },
  { label: "History", query: "history", icon: Landmark, tint: "text-amber bg-amber/10" },
  { label: "Science", query: "science", icon: Atom, tint: "text-signal bg-signal/10" },
  { label: "Fantasy", query: "fantasy", icon: Sparkles, tint: "text-accent bg-accent/10" },
  { label: "Philosophy", query: "philosophy", icon: Brain, tint: "text-accent-strong bg-accent/15" },
  { label: "Poetry", query: "poetry", icon: Feather, tint: "text-signal bg-signal/15" },
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
            className="chip font-medium hover:border-accent"
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