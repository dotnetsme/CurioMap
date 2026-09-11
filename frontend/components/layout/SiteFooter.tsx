import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-200">
            Curio<span className="text-gradient">Map</span>
          </p>
          <p className="text-xs">A live map of human curiosity. Open source, privacy-first.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <Link href="/discover/global" className="hover:text-white">
            Curiosity map
          </Link>
          <a href="/policy/privacy" className="hover:text-white">
            Privacy policy
          </a>
          <a href="/policy/affiliates" className="hover:text-white">
            Affiliate &amp; ads policy
          </a>
          <a
            href="https://github.com/curiomap/curiomap"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
          <span className="text-slate-500">Apache 2.0</span>
        </div>
      </div>
    </footer>
  );
}
