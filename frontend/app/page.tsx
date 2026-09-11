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
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-cyan-300/80">
          OPEN SOURCE · PRIVACY FIRST · APACHE 2.0
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          A live map of <span className="text-gradient">human curiosity</span>
        </h1>
        <p className="max-w-2xl text-slate-300">
          See what the world is reading right now — by city, by region, by bookshelf.
          Anonymous by default. Real when you choose. Conversations that stay short and sharp.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/discover/nearby"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 font-medium text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90"
          >
            See readers near you →
          </Link>
          <Link
            href="/discover/global"
            className="glass glass-hover px-6 py-3 font-medium text-slate-100"
          >
            Explore the curiosity map
          </Link>
        </div>
      </section>

      {summary ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Right now, on CurioMap</h2>
          <StatsBar stats={summary} />
        </section>
      ) : null}

      {map && map.regions.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">The curiosity map</h2>
          <GlobalMap regions={map.regions} />
        </section>
      ) : null}

      {summary && summary.topBooks.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-white">Top books being read</h2>
            <Link href="/discover/top-books" className="text-sm text-violet-300 hover:text-violet-200">
              Full list →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.topBooks.slice(0, 6).map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "🕶️ Anonymous by default",
            body: "Curated avatars and generated handles. A real name is opt-in and reversible — never required.",
          },
          {
            title: "📍 Fuzzy by design",
            body: "We store country, region, city and a coordinate fuzzed to a ~15 km grid. Never your exact location.",
          },
          {
            title: "💬 Short, sharp threads",
            body: "Prompt-driven conversations with reactions instead of emoji spam. Quiet threads archive themselves.",
          },
        ].map((f) => (
          <div key={f.title} className="glass p-5">
            <p className="font-semibold text-white">{f.title}</p>
            <p className="mt-1 text-sm text-slate-400">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
