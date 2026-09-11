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
    <div className="glass p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400">BUY THIS BOOK</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([store, url]) => (
          <a
            key={store}
            href={url}
            target="_blank"
            rel="noreferrer sponsored nofollow"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-violet-400/60 hover:bg-violet-500/15"
          >
            {labels[store] ?? store} ↗
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Affiliate links support CurioMap at no extra cost to you.{" "}
        <a href="/policy/affiliates" className="underline hover:text-slate-300">
          How it works
        </a>
      </p>
    </div>
  );
}
