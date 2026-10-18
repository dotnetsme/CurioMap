import Link from "next/link";
import { CuriosityMapShell } from "@/components/discover/CuriosityMapShell";
import { ObservatoryLegend } from "@/components/discover/ObservatoryLegend";
import { StatsBar } from "@/components/discover/StatsBar";
import { TopBooksRail } from "@/components/books/TopBooksRail";
import { BookSearchBar } from "@/components/books/BookSearchBar";
import { Avatar } from "@/components/profile/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { stats, globalDiscovery, globalMapReaders, topics } from "@/lib/server-api";
import {
  Compass,
  ArrowUpRight,
  LibraryBig,
  MapPin,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Orbit,
} from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: ShieldCheck,
    tint: "text-signal bg-signal/10",
    title: "Anonymous by default",
    body: "Curated vector avatars and generated handles. A real name is opt-in and reversible — never required.",
  },
  {
    icon: MapPin,
    tint: "text-heat-hot bg-heat-hot/10",
    title: "Fuzzy by design (~15 km)",
    body: "Coordinates are snapped to a ~15 km grid prior to persistence. Your exact GPS or home address is never stored.",
  },
  {
    icon: Orbit,
    tint: "text-amber bg-amber/10",
    title: "Curiosity vectors",
    body: "Thematic taxonomy mapping global intellectual currents across philosophy, science, fiction, and ideas.",
  },
  {
    icon: MessagesSquare,
    tint: "text-accent bg-accent/10",
    title: "Reading circles & salons",
    body: "Prompt-driven conversations with domain reactions (insightful, funny, helpful). Quiet threads archive gracefully.",
  },
];

const fallbackVectors = [
  "Philosophy",
  "Psychology",
  "Science & Nature",
  "History & Society",
  "Technology",
  "Sci-Fi",
  "Speculative & Magical",
  "Literary Fiction",
];

export default async function LandingPage() {
  const [summary, map, personas, topicList] = await Promise.all([
    stats().catch(() => null),
    globalDiscovery().catch(() => null),
    globalMapReaders(50).catch(() => null),
    topics().catch(() => []),
  ]);
  const readers = personas?.readers ?? [];
  const displayVectors = topicList.length > 0 
    ? topicList.map(t => ({ name: t.topic, count: t.readerCount }))
    : fallbackVectors.map(v => ({ name: v, count: null }));


  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {/* Hero */}
      <section className="px-2 pb-2 pt-10 text-center sm:pt-20">
        <Reveal y={12}>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent">
            <Sparkles size={14} /> Open source · Privacy first
          </p>
          <h1 className="display mx-auto mt-6 max-w-4xl text-balance text-5xl text-ink-strong sm:text-7xl lg:text-[88px]">
            A live map of <span className="text-gradient">human curiosity.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-xl leading-snug text-ink-muted sm:text-2xl">
            See what the world is reading right now. Search a book, find its
            readers, and keep your exact location private.
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <BookSearchBar />
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/discover/nearby" className="btn-primary">
              <Compass size={17} /> See readers near you
            </Link>
            <Link href="/discover/global" className="btn-ghost">
              <MapPin size={17} /> Explore the curiosity map
            </Link>
          </div>
          {summary ? (
            <dl className="mx-auto mt-14 grid max-w-xl grid-cols-3 gap-6 text-center">
              {[
                { v: summary.readers, l: "readers" },
                { v: summary.books, l: "books" },
                { v: summary.activeRegions, l: "regions" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col">
                  <dd className="stat-num order-first text-3xl sm:text-4xl">
                    {s.v.toLocaleString()}
                  </dd>
                  <dt className="mt-1 text-sm text-ink-faint">{s.l}</dt>
                </div>
              ))}
            </dl>
          ) : null}
        </Reveal>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="card p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              <Orbit size={15} /> Curiosity vectors
            </p>
            <Link
              href="/discover/global"
              className="text-sm font-medium text-accent hover:text-accent-strong"
            >
              Thematic map →
            </Link>
          </div>
          <h2 className="display mt-3 max-w-xl text-balance text-3xl text-ink-strong sm:text-4xl">
            What ideas are calling to you?
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
            Explore curated curiosity vectors across philosophy, science, fiction, and society, and see what curious minds are reading without algorithmic ads.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {displayVectors.map((v) => (
              <Link
                key={v.name}
                href={`/discover/global?topic=${encodeURIComponent(v.name)}`}
                className="chip min-h-11 px-4 py-2 text-sm"
              >
                <span className="font-medium">{v.name}</span>
                {v.count ? (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">
                    {v.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="card flex flex-col justify-between p-7 sm:p-9">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-signal">
              <Users size={15} /> Live community
            </p>
            <h2 className="display mt-3 text-balance text-3xl text-ink-strong sm:text-4xl">
              Find your next conversation.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              {summary
                ? `${summary.readers.toLocaleString()} readers are mapping their shelves across ${summary.activeRegions.toLocaleString()} regions worldwide.`
                : "Readers are mapping their shelves across the world."}
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between gap-4">
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
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full border-2 border-stage-2 bg-fill-2 text-xs font-semibold text-ink-muted">
                  +{readers.length - 5}
                </span>
              ) : null}
            </div>
            <Link href="/discover/global" className="btn-ghost shrink-0 px-4">
              Explore <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Map */}
      {map && map.regions.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Heatmap"
            title="The curiosity map"
            hint="Brighter glows mean more readers. Every glow is a fuzzed region (about 15 km grid), and the avatars are active readers."
            action={
              <Link
                href="/discover/global"
                className="text-base font-medium text-accent hover:text-accent-strong"
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
        <section className="flex flex-col gap-6">
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
        <section className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Trending"
            title="Top books being read"
            hint="What curious minds can't put down this week."
          />
          <TopBooksRail books={summary.topBooks} />
        </section>
      ) : null}

      {/* Features */}
      <section className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Why CurioMap"
          title="Built for readers, not advertisers"
          align="center"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="card h-full p-7">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.tint}`}
                >
                  <f.icon size={22} strokeWidth={2} />
                </span>
                <p className="mt-5 text-lg font-semibold tracking-tight text-ink-strong">
                  {f.title}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="flex flex-col items-center gap-5 rounded-[32px] bg-stage-3 px-6 py-20 text-center">
          <h2 className="display max-w-2xl text-balance text-4xl text-ink-strong sm:text-6xl">
            Put your city on the map of curiosity.
          </h2>
          <p className="max-w-xl text-lg text-ink-muted">
            Shelve your first book, find readers nearby, and start a circle.
            Free forever, open source, no ads.
          </p>
          <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/register" className="btn-primary">
              <Users size={17} /> Start your shelf
            </Link>
            <Link href="/books/search" className="btn-ghost">
              <LibraryBig size={17} /> Find a book
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
