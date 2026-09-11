"use client";

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
      <p className="mono-label mb-2 text-ink-3">BUY THIS BOOK</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([store, url]) => (
          <a
            key={store}
            href={url}
            target="_blank"
            rel="noreferrer sponsored nofollow"
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-accent hover:bg-accent-soft hover:text-accent-strong"
          >
            {labels[store] ?? store} ↗
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        Affiliate links support CurioMap at no extra cost to you.{" "}
        <a href="/policy/affiliates" className="underline hover:text-ink">
          How it works
        </a>
      </p>
    </div>
  );
}
