"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/profile/Avatar";

const navItems = [
  { href: "/discover/nearby", label: "Nearby" },
  { href: "/discover/global", label: "Curiosity map" },
  { href: "/books/search", label: "Books" },
  { href: "/feed", label: "Feed" },
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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm leading-none text-surface">
            CM
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            CurioMap
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                pathname.startsWith(item.href)
                  ? "bg-ink text-surface"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="cursor-pointer rounded-full outline-none ring-accent/40 hover:ring-2"
                aria-label="Account menu"
              >
                <Avatar avatarId={user.avatarId} name={user.displayName} size={34} />
              </button>
              {menuOpen ? (
                <div className="card absolute right-0 mt-2 w-52 overflow-hidden bg-surface p-1.5 text-sm shadow-xl">
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-ink">{user.displayName}</p>
                    <p className="truncate text-xs text-ink-3">@{user.handle}</p>
                  </div>
                  {[
                    { href: "/me", label: "My profile" },
                    { href: "/me/bookshelf", label: "My bookshelf" },
                    { href: "/me/settings", label: "Settings" },
                    ...(user.isAdmin ? [{ href: "/admin", label: "Moderation" }] : []),
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full px-3.5 py-1.5 text-sm text-ink-2 hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="btn-accent text-sm"
              >
                Join CurioMap
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
