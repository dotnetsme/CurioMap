import Link from "next/link";
import { BookCard } from "@/components/books/BookCard";
import { GlobalMap, StatsBar } from "@/components/discover/GlobalMap";
import { stats, globalDiscovery } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [summary, map] = await Promise.all([
    stats().catch(() => null),
    globalDiscovery().catch(() => null),
  ]);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-5 py-16 text-center">
        <p className="label-sm text-amber">
          OPEN SOURCE · PRIVACY FIRST · APACHE 2.0
        </p>
        <h1 className="max-w-4xl font-display text-5xl font-bold leading-[1.1] text-ink sm:text-6xl">
          A live map of <span className="text-amber">human curiosity</span>
        </h1>
        <p className="max-w-2xl text-lg text-ink-muted">
          See what the world is reading right now — by city, by region, by bookshelf.
          Anonymous by default. Real when you choose. Conversations that stay short and sharp.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <Link
            href="/discover/nearby"
            className="btn-primary px-8 py-3 text-base font-semibold"
          >
            See readers near you →
          </Link>
          <Link
            href="/discover/global"
            className="btn-ghost px-8 py-3 text-base font-semibold"
          >
            Explore the curiosity map
          </Link>
        </div>
      </section>

      {/* Stats */}
      {summary ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-faint">
            Right now, on CurioMap
          </h2>
          <StatsBar stats={summary} />
        </section>
      ) : null}

      {/* Map */}
      {map && map.regions.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-faint">
            The curiosity map
          </h2>
          <GlobalMap regions={map.regions} />
        </section>
      ) : null}

      {/* Top books */}
      {summary && summary.topBooks.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-faint">
              Top books being read
            </h2>
            <Link href="/discover/top-books" className="text-sm font-medium text-amber hover:text-amber/80">
              Full list →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.topBooks.slice(0, 6).map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Features */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: "🕶️",
            title: "Anonymous by default",
            body: "Curated avatars and generated handles. A real name is opt-in and reversible — never required.",
          },
          {
            icon: "📍",
            title: "Fuzzy by design",
            body: "We store country, region, city and a coordinate fuzzed to a ~15 km grid. Never your exact location.",
          },
          {
            icon: "💬",
            title: "Short, sharp threads",
            body: "Prompt-driven conversations with reactions instead of emoji spam. Quiet threads archive themselves.",
          },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <span className="text-2xl">{f.icon}</span>
            <p className="mt-3 font-semibold text-ink">{f.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
