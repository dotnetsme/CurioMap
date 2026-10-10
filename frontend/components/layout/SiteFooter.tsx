import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line py-10">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[11px] font-semibold leading-none text-surface">
              CM
            </span>
            <span className="text-sm font-semibold text-ink">CurioMap</span>
          </div>
          <p className="mt-2 max-w-xs text-sm text-ink-faint">
            A live map of human curiosity. Open source, privacy-first.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="mono-label text-ink-faint">Discover</span>
            <Link href="/discover/global" className="text-ink-muted hover:text-ink">
              Curiosity map
            </Link>
            <Link href="/discover/global" className="text-ink-muted hover:text-ink">
              Curiosity vectors
            </Link>
            <Link href="/discover/nearby" className="text-ink-muted hover:text-ink">
              Nearby readers
            </Link>
            <Link href="/discover/top-books" className="text-ink-muted hover:text-ink">
              Top books
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="mono-label text-ink-faint">Platform</span>
            <Link href="/books/search" className="text-ink-muted hover:text-ink">
              Book search
            </Link>
            <Link href="/circles" className="text-ink-muted hover:text-ink">
              Reading circles
            </Link>
            <Link href="/feed" className="text-ink-muted hover:text-ink">
              Activity feed
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="mono-label text-ink-faint">Project</span>
            <Link href="/policy/terms" className="text-ink-muted hover:text-ink">
              Terms of use
            </Link>
            <Link href="/policy/privacy" className="text-ink-muted hover:text-ink">
              Privacy policy
            </Link>
            <Link href="/policy/affiliates" className="text-ink-muted hover:text-ink">
              Affiliate policy
            </Link>
            <a
              href="https://github.com/curiomap/curiomap"
              target="_blank"
              rel="noreferrer"
              className="text-ink-muted hover:text-ink"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-[1280px] px-5 sm:px-8">
        <div className="flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <span>
            © 2026 CurioMap. Apache 2.0. Use of this site is subject to the{" "}
            <Link href="/policy/terms" className="underline underline-offset-2 hover:text-ink">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/policy/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" />
            Built in public, privacy-first.
          </span>
        </div>
      </div>
    </footer>
  );
}
