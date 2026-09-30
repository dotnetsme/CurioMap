import Link from "next/link";
import { Compass, LibraryBig, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-full border border-line-2 bg-accent-soft/30 p-5 shadow-[0_0_32px_rgba(139,92,246,0.3)] backdrop-blur-md">
          <Compass className="h-full w-full text-signal animate-pulse" />
        </div>
        <span className="absolute -bottom-1 -right-1 rounded-full border border-line bg-stage-2 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
          404
        </span>
      </div>

      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong sm:text-4xl">
        Uncharted Coordinates
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
        You&apos;ve wandered into an empty stretch of cosmic space. No books or reader
        conversations exist at this URL.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/discover/global"
          className="btn-primary inline-flex min-h-11 items-center gap-2 px-5 text-sm font-bold text-accent-ink shadow-lg shadow-accent/25"
        >
          <Compass size={16} /> Explore the curiosity map
        </Link>
        <Link
          href="/books/search"
          className="btn-ghost inline-flex min-h-11 items-center gap-2 px-5 text-sm font-semibold"
        >
          <LibraryBig size={16} /> Search catalog
        </Link>
        <Link
          href="/home"
          className="btn-ghost inline-flex min-h-11 items-center gap-2 px-4 text-sm"
        >
          <Home size={16} /> Home
        </Link>
      </div>
    </div>
  );
}
