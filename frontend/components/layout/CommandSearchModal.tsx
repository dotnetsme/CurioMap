"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Compass,
  CornerDownLeft,
  Flame,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { search as searchBooks } from "@/lib/api/books";
import type { Book } from "@/types";
import { Spinner } from "@/components/ui/Feedback";
import { BookCover } from "@/components/books/BookCover";

interface QuickLink {
  href: string;
  title: string;
  subtitle: string;
  icon: typeof Compass;
  badge?: string;
}

const quickLinks: QuickLink[] = [
  {
    href: "/discover/global",
    title: "Global Curiosity Map",
    subtitle: "Explore live reader density across ~15 km grid regions",
    icon: Compass,
    badge: "Live",
  },
  {
    href: "/discover/nearby",
    title: "Nearby Readers",
    subtitle: "Discover readers and shared curiosities in your region",
    icon: MapPin,
  },
  {
    href: "/me/bookshelf",
    title: "My Bookshelf",
    subtitle: "View and organize your reading list and progress",
    icon: BookMarked,
  },
  {
    href: "/circles",
    title: "Reading Circles",
    subtitle: "Prompt-driven, micro-conversation community circles",
    icon: Users,
  },
  {
    href: "/feed",
    title: "Activity Feed",
    subtitle: "Real-time updates, reactions, and reader discussions",
    icon: Flame,
  },
  {
    href: "/discover/top-books",
    title: "Top Books",
    subtitle: "Most read and discussed titles worldwide",
    icon: BookOpen,
  },
];

export function CommandSearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, startTransition] = useTransition();

  // Reset state when modal opens or closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle escape & keyboard listeners
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      const totalItems = query.trim().length > 0 ? results.length + 1 : quickLinks.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim().length > 0) {
          if (selectedIndex < results.length) {
            const selectedBook = results[selectedIndex];
            onClose();
            router.push(`/books/${selectedBook.id}`);
          } else {
            // "Search all books" action
            onClose();
            router.push(`/books/search?q=${encodeURIComponent(query.trim())}`);
          }
        } else if (selectedIndex < quickLinks.length) {
          const selectedLink = quickLinks[selectedIndex];
          onClose();
          router.push(selectedLink.href);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, query, results, selectedIndex, router]);

  // Prevent background scroll
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchBooks(trimmed, 6, 0);
          setResults(res.items || []);
          setSelectedIndex(0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      });
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-stage/80 p-3 pt-12 sm:p-6 sm:pt-20 backdrop-blur-md transition-opacity"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick search and command palette"
        onClick={(e) => e.stopPropagation()}
        className="card relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line-2 bg-stage-2/95 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10"
      >
        {/* Input Header */}
        <div className="relative flex items-center border-b border-line px-4 py-3.5">
          <Search size={18} className="shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, authors, or navigate..."
            className="ml-3 w-full bg-transparent text-sm font-medium text-ink placeholder:text-ink-faint focus:outline-none"
            aria-label="Search books or navigation links"
          />
          {loading ? (
            <span className="mr-2 flex shrink-0 items-center justify-center">
              <Spinner className="h-4 w-4 text-accent" />
            </span>
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mr-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-ink-faint hover:bg-white/10 hover:text-ink"
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          ) : null}
          <kbd className="hidden sm:inline-block rounded border border-line bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
            ESC
          </kbd>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {!hasQuery ? (
            <div className="py-2">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Quick Navigation
              </p>
              <div className="flex flex-col gap-0.5">
                {quickLinks.map((link, index) => {
                  const isSelected = selectedIndex === index;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex min-h-11 cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition ${
                        isSelected
                          ? "bg-accent/15 text-ink ring-1 ring-accent/30"
                          : "text-ink-muted hover:bg-white/5 hover:text-ink"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                            isSelected
                              ? "bg-accent text-accent-ink"
                              : "bg-white/5 text-ink-faint"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {link.title}
                          </p>
                          <p className="truncate text-xs text-ink-faint">
                            {link.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {link.badge ? (
                          <span className="rounded-full bg-signal/20 px-2 py-0.5 text-[10px] font-bold text-signal">
                            {link.badge}
                          </span>
                        ) : null}
                        {isSelected ? (
                          <CornerDownLeft size={13} className="text-accent" />
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Books & Catalog
              </p>
              <div className="flex flex-col gap-1">
                {results.map((book, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <Link
                      key={book.id}
                      href={`/books/${book.id}`}
                      onClick={onClose}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex min-h-12 cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition ${
                        isSelected
                          ? "bg-accent/15 text-ink ring-1 ring-accent/30"
                          : "text-ink-muted hover:bg-white/5 hover:text-ink"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 overflow-hidden rounded ring-1 ring-line">
                          <BookCover book={book} size={28} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {book.title}
                          </p>
                          <p className="truncate text-xs text-ink-faint">
                            {book.author}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {book.readersCount > 0 ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono text-ink-muted">
                            {book.readersCount} {book.readersCount === 1 ? "reader" : "readers"}
                          </span>
                        ) : null}
                        {isSelected ? (
                          <CornerDownLeft size={13} className="text-accent" />
                        ) : null}
                      </div>
                    </Link>
                  );
                })}

                {/* View all search results option */}
                <Link
                  href={`/books/search?q=${encodeURIComponent(trimmedQuery)}`}
                  onClick={onClose}
                  onMouseEnter={() => setSelectedIndex(results.length)}
                  className={`mt-1 flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-line-2 px-3 py-2.5 transition ${
                    selectedIndex === results.length
                      ? "bg-accent text-accent-ink font-semibold"
                      : "bg-stage text-ink hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Search size={14} />
                    <span>Search all catalog results for &ldquo;{trimmedQuery}&rdquo;</span>
                  </span>
                  <CornerDownLeft size={14} />
                </Link>
              </div>
            </div>
          ) : !loading ? (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-ink-faint">
                <BookOpen size={18} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">
                No matching books found for &ldquo;{trimmedQuery}&rdquo;
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                Try searching by title, author name, or ISBN number.
              </p>
              <div className="mt-4 flex justify-center">
                <Link
                  href={`/books/search?q=${encodeURIComponent(trimmedQuery)}`}
                  onClick={onClose}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Search on Open Library & Google Books
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Keyboard Guide */}
        <div className="flex items-center justify-between border-t border-line bg-stage-3/40 px-4 py-2 text-[11px] text-ink-faint">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span>CurioMap Fast Nav</span>
        </div>
      </div>
    </div>
  );
}
