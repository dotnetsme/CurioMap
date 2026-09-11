import Link from "next/link";
import { CuriosityMapShell } from "@/components/discover/CuriosityMapShell";
import { StatsBar } from "@/components/discover/StatsBar";
import { TopBooksRail } from "@/components/books/TopBooksRail";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { stats, globalDiscovery } from "@/lib/server-api";
import { Compass, LibraryBig, MapPin, MessagesSquare, ShieldCheck, Sparkles, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: ShieldCheck,
    tint: "text-emerald-500 bg-emerald-500/10",
    title: "Anonymous by default",
    body: "Curated avatars and generated handles. A real name is opt-in and reversible — never required.",
  },
  {
    icon: MapPin,
    tint: "text-amber-500 bg-amber-500/10",
    title: "Fuzzy by design",
    body: "We store country, region, city and a coordinate fuzzed to a ~15 km grid. Never your exact location.",
  },
  {
    icon: MessagesSquare,
    tint: "text-violet-500 bg-violet-500/10",
    title: "Reading circles",
    body: "Prompt-driven conversations with reactions instead of noise. Quiet threads archive themselves.",
  },
];

export default async function LandingPage() {
  const [summary, map] = await Promise.all([
    stats().catch(() => null),
    globalDiscovery().catch(() => null),
  ]);

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="night-panel px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="anim-floaty absolute left-[8%] top-[18%] hidden h-16 w-12 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 shadow-2xl shadow-amber-500/30 md:block" />
            <div className="anim-floaty absolute right-[10%] top-[30%] hidden h-20 w-14 rounded-md bg-gradient-to-br from-violet-400 to-indigo-700 shadow-2xl shadow-violet-500/30 [animation-delay:1.2s] md:block" />
            <div className="anim-floaty absolute bottom-[16%] left-[16%] hidden h-14 w-10 rounded-md bg-gradient-to-br from-emerald-400 to-teal-700 shadow-2xl shadow-emerald-500/30 [animation-delay:2.1s] md:block" />
            <div className="anim-floaty absolute bottom-[24%] right-[18%] hidden h-12 w-9 rounded-md bg-gradient-to-br from-rose-400 to-red-700 shadow-2xl shadow-rose-500/30 [animation-delay:0.6s] md:block" />
          </div>
          <Reveal className="relative">
            <p className="label-sm inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-1.5 text-amber-300">
              <Sparkles size={12} /> OPEN SOURCE · PRIVACY FIRST · APACHE 2.0
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-amber-50 text-balance sm:text-6xl lg:text-7xl">
              A live map of{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                human curiosity
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-amber-100/70 sm:text-lg">
              See what the world is reading right now — by city, by region, by bookshelf.
              Anonymous by default. Real when you choose.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/discover/nearby"
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-[15px] font-bold text-night shadow-xl shadow-amber-500/30 transition hover:bg-amber-300 active:scale-[0.98]"
              >
                <Compass size={17} /> See readers near you
              </Link>
              <Link
                href="/discover/global"
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-white/5 px-7 py-3 text-[15px] font-semibold text-amber-100 backdrop-blur transition hover:border-amber-300/60 hover:bg-white/10"
              >
                <MapPin size={17} /> Explore the curiosity map
              </Link>
            </div>
            {summary ? (
              <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-8 text-center">
                {[
                  { v: summary.readers, l: "readers" },
                  { v: summary.books, l: "books" },
                  { v: summary.activeRegions, l: "regions" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-display text-2xl font-bold text-amber-100 sm:text-3xl">
                      {s.v.toLocaleString()}
                    </p>
                    <p className="label-sm mt-1 text-amber-200/50">{s.l}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      {summary ? (
        <section className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Pulse"
            title="Right now, on CurioMap"
            hint="Live counts from readers mapping their shelves across the globe."
          />
          <StatsBar stats={summary} />
        </section>
      ) : null}

      {/* Map */}
      {map && map.regions.length > 0 ? (
        <section className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Heatmap"
            title="The curiosity map"
            hint="Every glow is a fuzzed region — never an exact location."
            action={
              <Link href="/discover/global" className="text-sm font-semibold text-accent-strong hover:text-accent">
                Open full map →
              </Link>
            }
          />
          <Reveal>
            <CuriosityMapShell regions={map.regions} height={440} />
          </Reveal>
        </section>
      ) : null}

      {/* Top books */}
      {summary && summary.topBooks.length > 0 ? (
        <section className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Trending"
            title="Top books being read"
            hint="What curious minds can't put down this week."
          />
          <TopBooksRail books={summary.topBooks} />
        </section>
      ) : null}

      {/* Features */}
      <section className="flex flex-col gap-5">
        <SectionHeading
          eyebrow="Why CurioMap"
          title="Built for readers, not advertisers"
          align="center"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="card card-hover h-full p-6">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${f.tint}`}>
                  <f.icon size={20} strokeWidth={2.2} />
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-ink">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="night-panel flex flex-col items-center gap-5 rounded-3xl px-6 py-14 text-center">
          <p className="label-sm text-amber-300">Join the 2026 reading challenge</p>
          <h2 className="max-w-2xl font-display text-3xl font-bold text-amber-50 text-balance sm:text-5xl">
            Put your city on the map of curiosity
          </h2>
          <p className="max-w-xl text-[15px] text-amber-100/65">
            Shelve your first book, find readers nearby, and start a circle. Free forever, open source, no ads.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-[15px] font-bold text-night shadow-xl shadow-amber-500/30 transition hover:bg-amber-300 active:scale-[0.98]"
            >
              <Users size={17} /> Start your shelf
            </Link>
            <Link
              href="/books/search"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 px-7 py-3 text-[15px] font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-white/5"
            >
              <LibraryBig size={17} /> Find a book
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
