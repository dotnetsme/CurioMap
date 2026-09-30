import Link from "next/link";
import { CuriosityMapShell } from "@/components/discover/CuriosityMapShell";
import { ObservatoryLegend } from "@/components/discover/ObservatoryLegend";
import { StatsBar } from "@/components/discover/StatsBar";
import { TopBooksRail } from "@/components/books/TopBooksRail";
import { BookSearchBar } from "@/components/books/BookSearchBar";
import { Avatar } from "@/components/profile/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { stats, globalDiscovery, globalMapReaders } from "@/lib/server-api";
import {
  Compass,
  ArrowUpRight,
  BookOpen,
  LibraryBig,
  MapPin,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: ShieldCheck,
    tint: "text-signal bg-signal/10",
    title: "Anonymous by default",
    body: "Curated avatars and generated handles. A real name is opt-in and reversible — never required.",
  },
  {
    icon: MapPin,
    tint: "text-heat-hot bg-heat-hot/10",
    title: "Fuzzy by design",
    body: "We store country, region, city and a coordinate fuzzed to a ~15 km grid. Never your exact location.",
  },
  {
    icon: MessagesSquare,
    tint: "text-accent bg-accent/10",
    title: "Reading circles",
    body: "Prompt-driven conversations with reactions instead of noise. Quiet threads archive themselves.",
  },
];

const quickGenres = [
  "Fiction",
  "Fantasy",
  "History",
  "Science fiction",
  "Biography",
  "Mystery",
];

export default async function LandingPage() {
  const [summary, map, personas] = await Promise.all([
    stats().catch(() => null),
    globalDiscovery().catch(() => null),
    globalMapReaders(50).catch(() => null),
  ]);
  const readers = personas?.readers ?? [];

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl">
        <div className="night-panel px-4 py-7 text-center sm:px-8 sm:py-9">
          <Reveal className="relative" y={14}>
            <p className="label-sm inline-flex items-center gap-2 rounded-full border border-line-2 bg-accent-soft px-3 py-1 text-ink">
              <Sparkles size={12} /> OPEN SOURCE · PRIVACY FIRST · APACHE 2.0
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink-strong text-balance sm:text-4xl lg:text-5xl">
              A live map of{" "}
              <span className="bg-gradient-to-r from-signal via-accent to-heat-hot bg-clip-text text-transparent">
                human curiosity
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              See what the world is reading right now. Search a book, find its
              readers, and keep your exact location private.
            </p>
            <div className="mx-auto mt-4 max-w-xl transition-transform duration-300 hover:-translate-y-0.5">
              <BookSearchBar />
            </div>
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:justify-center">
              <Link
                href="/discover/nearby"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink shadow-xl shadow-accent/30 transition hover:bg-accent-strong active:scale-[0.98] sm:w-auto"
              >
                <Compass size={17} /> See readers near you
              </Link>
              <Link
                href="/discover/global"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-2 bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink backdrop-blur transition hover:border-accent hover:bg-white/10 sm:w-auto"
              >
                <MapPin size={17} /> Explore the curiosity map
              </Link>
            </div>
            {summary ? (
              <div className="mx-auto mt-4 grid max-w-lg grid-cols-3 gap-3 text-center">
                {[
                  { v: summary.readers, l: "readers" },
                  { v: summary.books, l: "books" },
                  { v: summary.activeRegions, l: "regions" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-display text-xl font-bold text-ink-strong sm:text-2xl">
                      {s.v.toLocaleString()}
                    </p>
                    <p className="label-sm mt-1 text-ink-faint">{s.l}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5 sm:p-6">
          <p className="label-sm text-accent">Start with a feeling</p>
          <h2 className="mt-2 max-w-xl font-display text-2xl font-semibold text-ink sm:text-3xl">
            What are you in the mood to read?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Browse a familiar doorway, then follow the people and conversations
            that make a book worth opening.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {quickGenres.map((genre) => (
              <Link
                key={genre}
                href={`/books/search?q=${encodeURIComponent(genre)}`}
                className="chip min-h-11 px-4 text-sm hover:border-accent hover:text-ink"
              >
                <BookOpen size={14} /> {genre}
              </Link>
            ))}
          </div>
        </div>

        <div className="card flex flex-col justify-between bg-accent/10 p-5 sm:p-6">
          <div>
            <p className="label-sm text-signal">Readers are here</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              Find your next conversation.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {summary
                ? `${summary.readers.toLocaleString()} readers are mapping their shelves across ${summary.activeRegions.toLocaleString()} regions.`
                : "Readers are mapping their shelves across the world."}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex -space-x-2" aria-label="Readers on CurioMap">
              {readers.slice(0, 5).map((reader) => (
                <Avatar
                  key={reader.user.id}
                  avatarId={reader.user.avatarId}
                  name={reader.user.displayName}
                  size={38}
                />
              ))}
              {readers.length > 5 ? (
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full border-2 border-stage bg-surface text-xs font-semibold text-ink-muted">
                  +{readers.length - 5}
                </span>
              ) : null}
            </div>
            <Link
              href="/discover/global"
              className="btn-ghost min-h-11 shrink-0 px-3 text-sm"
            >
              Explore <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Map */}
      {map && map.regions.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeading
            eyebrow="Heatmap"
            title="The curiosity map"
            hint="Heat blooms from cyan aurora → electric violet → supernova flame. Every glow is a fuzzed region (~15 km grid); avatars below are active readers."
            action={
              <Link
                href="/discover/global"
                className="text-sm font-semibold text-accent hover:text-accent-strong"
              >
                Open full map →
              </Link>
            }
          />
          <ObservatoryLegend />
          <Reveal>
            <div className="relative h-[420px] sm:h-[560px]">
              <CuriosityMapShell
                regions={map.regions}
                readers={readers}
                height={0}
                overlayStats={
                  summary
                    ? {
                        readers: summary.readers,
                        regions: summary.activeRegions,
                      }
                    : null
                }
              />
            </div>
          </Reveal>
        </section>
      ) : null}

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
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${f.tint}`}
                >
                  <f.icon size={20} strokeWidth={2.2} />
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-ink">
                  {f.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="night-panel flex flex-col items-center gap-5 rounded-3xl px-6 py-14 text-center">
          <p className="label-sm text-signal">
            Join the 2026 reading challenge
          </p>
          <h2 className="max-w-2xl font-display text-3xl font-bold text-ink-strong text-balance sm:text-5xl">
            Put your city on the map of curiosity
          </h2>
          <p className="max-w-xl text-[15px] text-ink-muted">
            Shelve your first book, find readers nearby, and start a circle.
            Free forever, open source, no ads.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 text-[15px] font-bold text-accent-ink shadow-xl shadow-accent/30 transition hover:bg-accent-strong active:scale-[0.98] sm:w-auto"
            >
              <Users size={17} /> Start your shelf
            </Link>
            <Link
              href="/books/search"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line-2 px-7 py-3 text-[15px] font-semibold text-ink transition hover:border-accent hover:bg-white/5 sm:w-auto"
            >
              <LibraryBig size={17} /> Find a book
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
