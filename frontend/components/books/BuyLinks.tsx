"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

const labels: Record<string, string> = {
  amazon: "Buy on Amazon",
  bookshop: "Buy on Bookshop",
  kobo: "Buy on Kobo",
  indiebound: "Indie bookstore",
  publisher: "Publisher",
};

export function BuyLinks({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links).filter(([, url]) => url);
  if (entries.length === 0) return null;

  return (
    <div className="card p-4">
      <p className="mono-label mb-2 text-ink-faint">BUY THIS BOOK</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([store, url]) => (
          <a
            key={store}
            href={url}
            target="_blank"
            rel="noreferrer sponsored nofollow"
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent-strong"
          >
            <span>{labels[store] ?? store}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        Affiliate links support CurioMap at no extra cost to you.{" "}
        <Link href="/policy/affiliates" className="underline hover:text-ink">
          How it works
        </Link>
      </p>
    </div>
  );
}
