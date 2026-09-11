"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpenText, Compass, Flame, LibraryBig, LogOut, Map as MapIcon, Search, Settings, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/profile/Avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/discover/nearby", label: "Nearby", icon: Compass },
  { href: "/discover/global", label: "Curiosity map", icon: MapIcon },
  { href: "/books/search", label: "Books", icon: LibraryBig },
  { href: "/feed", label: "Feed", icon: Flame },
];

export function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink via-ink to-accent-strong text-amber-300 shadow-lg transition group-hover:scale-105">
              <BookOpenText size={18} />
            </span>
            <span className="hidden text-[16px] font-bold tracking-tight text-ink min-[400px]:block">
              CurioMap
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition",
                    active ? "bg-ink text-surface shadow" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/books/search"
            className="mx-auto hidden w-full max-w-xs items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-3 transition hover:border-ink-2 hover:text-ink md:flex"
          >
            <Search size={15} />
            <span className="truncate">Search books, readers, cities…</span>
            <kbd className="ml-auto rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
              ⌘K
            </kbd>
          </Link>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="cursor-pointer rounded-full outline-none transition ring-accent/40 hover:ring-2"
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar avatarId={user.avatarId} name={user.displayName} size={36} />
                </button>
                {menuOpen ? (
                  <div className="card absolute right-0 mt-2 w-60 overflow-hidden bg-surface p-1.5 text-sm shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-line px-3 py-3">
                      <Avatar avatarId={user.avatarId} name={user.displayName} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{user.displayName}</p>
                        <p className="truncate text-xs text-ink-3">@{user.handle}</p>
                      </div>
                    </div>
                    {[
                      { href: "/me", label: "My profile", icon: User },
                      { href: "/me/bookshelf", label: "My bookshelf", icon: LibraryBig },
                      { href: "/me/settings", label: "Settings", icon: Settings },
                      ...(user.isAdmin ? [{ href: "/admin", label: "Moderation", icon: ShieldCheck }] : []),
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                      >
                        <item.icon size={15} />
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
                <Link
                  href="/auth/login"
                  className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-2 transition hover:text-ink sm:block"
                >
                  Sign in
                </Link>
                <Link href="/auth/register" className="btn-accent text-sm shadow-lg shadow-accent/25">
                  Join CurioMap
                </Link>
            </>
          )}
          </div>
        </div>
      </header>
    </>
  );
}
