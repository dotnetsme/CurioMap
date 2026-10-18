"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Compass, LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PageLoading } from "@/components/ui/Feedback";

/**
 * Single gate for every signed-in-only surface. Children are not mounted while
 * the session is still resolving or absent, so authed fetches never fire for
 * logged-out visitors (they would only produce 401s and error states).
 */
export function AuthGate({
  icon: Icon = Compass,
  eyebrow,
  title,
  body,
  children,
}: {
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  eyebrow?: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoading />;

  if (!user) {
    return (
      <div className="night-panel mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl px-8 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Icon size={26} />
        </span>
        {eyebrow ? <p className="label-sm text-signal">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-bold text-ink-strong">{title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/auth/login" className="btn-accent">
            <LogIn size={15} /> Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-full border border-line-2 px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-fill"
          >
            Join free
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
