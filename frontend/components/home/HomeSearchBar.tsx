"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

/**
 * Search field laid over the map hero. Submitting routes to the catalog search
 * (same query param the header search and landing page use).
 */
export function HomeSearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const ready = query.trim().length >= 2;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    router.push(`/books/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`flex items-center gap-2.5 rounded-full border border-line bg-surface/95 px-4 py-2.5 shadow-xl shadow-black/20 backdrop-blur transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 ${className}`}
    >
      <Search size={17} className="shrink-0 text-ink-3" aria-hidden />
      <label htmlFor="home-search" className="sr-only">
        Explore books and readers
      </label>
      <input
        id="home-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Explore books, authors, ISBNs…"
        autoComplete="off"
        className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
      />
      {ready ? (
        <button
          type="submit"
          className="shrink-0 cursor-pointer rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Search
        </button>
      ) : null}
    </form>
  );
}
