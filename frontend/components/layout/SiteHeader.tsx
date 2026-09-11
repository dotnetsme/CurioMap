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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b18]/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold">
          <span className="text-lg">🗺️</span>
          <span>
            Curio<span className="text-gradient">Map</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                pathname.startsWith(item.href)
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="cursor-pointer rounded-full outline-none ring-violet-400/60 hover:ring-2"
                aria-label="Account menu"
              >
                <Avatar avatarId={user.avatarId} name={user.displayName} size={34} />
              </button>
              {menuOpen ? (
                <div className="glass absolute right-0 mt-2 w-48 overflow-hidden bg-[#0d1326] py-1 text-sm">
                  <div className="border-b border-white/10 px-4 py-2">
                    <p className="truncate text-white">{user.displayName}</p>
                    <p className="truncate text-xs text-slate-400">@{user.handle}</p>
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
                      className="block px-4 py-2 text-slate-300 hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    className="block w-full cursor-pointer px-4 py-2 text-left text-rose-300 hover:bg-white/5"
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
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
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
