"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookMarked,
  Compass,
  Flame,
  House,
  LibraryBig,
  LogOut,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/profile/Avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: House, authOnly: true },
  { href: "/discover/global", label: "Discover", icon: Compass },
  {
    href: "/me/bookshelf",
    label: "My Shelf",
    icon: BookMarked,
    authOnly: true,
  },
  { href: "/feed", label: "Community", icon: Flame },
] as const;

const mobileNavItems = [
  { href: "/home", label: "Home", icon: House },
  { href: "/discover/global", label: "Discover", icon: Compass },
  { href: "/me/bookshelf", label: "Shelf", icon: BookMarked, authOnly: true },
  { href: "/feed", label: "Feed", icon: Flame },
  { href: "/me", label: "Profile", icon: User, authOnly: true },
] as const;

export function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K / Ctrl+K jumps to book search — matches the hint shown in the header field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/books/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-stage/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-4 sm:h-18 sm:px-8">
          <Link
            href={user ? "/home" : "/"}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-strong to-signal text-accent-ink shadow-lg shadow-accent/25 transition group-hover:scale-105">
              <Compass size={18} strokeWidth={2.4} />
            </span>
            <span className="hidden text-[18px] font-bold tracking-tight text-ink sm:block">
              CurioMap
            </span>
          </Link>

          <nav
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            aria-label="Primary"
          >
            {navItems
              .filter(
                (item) =>
                  !("authOnly" in item && item.authOnly) || Boolean(user),
              )
              .map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition",
                      active
                        ? "bg-accent text-accent-ink shadow-sm"
                        : "text-ink-muted hover:bg-white/5 hover:text-ink",
                    )}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full outline-none transition ring-accent/40 hover:ring-2"
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar
                    avatarId={user.avatarId}
                    name={user.displayName}
                    size={36}
                  />
                </button>
                {menuOpen ? (
                  <div className="card absolute right-0 mt-2 w-60 overflow-hidden p-1.5 text-sm shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-line px-3 py-3">
                      <Avatar
                        avatarId={user.avatarId}
                        name={user.displayName}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {user.displayName}
                        </p>
                        <p className="truncate text-xs text-ink-faint">
                          @{user.handle}
                        </p>
                      </div>
                    </div>
                    {[
                      { href: "/home", label: "Home", icon: House },
                      { href: "/me", label: "My profile", icon: User },
                      {
                        href: "/me/bookshelf",
                        label: "My bookshelf",
                        icon: LibraryBig,
                      },
                      {
                        href: "/me/settings",
                        label: "Settings",
                        icon: Settings,
                      },
                      ...(user.isAdmin
                        ? [
                            {
                              href: "/admin",
                              label: "Moderation",
                              icon: ShieldCheck,
                            },
                          ]
                        : []),
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-ink-muted transition hover:bg-white/5 hover:text-ink"
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
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-heat-hot transition hover:bg-heat-hot/10"
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
                  className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-muted transition hover:text-ink sm:block"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-accent text-sm shadow-lg shadow-accent/25"
                >
                  Join CurioMap
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {user ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-stage/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
          aria-label="Mobile primary"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            {mobileNavItems
              .filter(
                (item) =>
                  !("authOnly" in item && item.authOnly) || Boolean(user),
              )
              .map((item) => {
                const active =
                  item.href === "/home"
                    ? pathname === "/home"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition",
                      active
                        ? "text-accent"
                        : "text-ink-faint hover:bg-white/5 hover:text-ink",
                    )}
                  >
                    <item.icon size={19} strokeWidth={active ? 2.4 : 1.9} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        </nav>
      ) : null}
    </>
  );
}
