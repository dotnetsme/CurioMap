import Link from "next/link";

export default function TermsOfUsePage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="display text-4xl text-ink-strong sm:text-5xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Version 1.0 · Effective 2026-09-18 · Binding between you and the CurioMap
        maintainers. The full formal text lives in the repository
        (<code className="text-xs">docs/terms-of-use.md</code>); this page carries the
        operative substance, with cross-links to the{" "}
        <Link href="/policy/privacy" className="font-medium text-accent-strong hover:text-accent">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/policy/affiliates" className="font-medium text-accent-strong hover:text-accent">
          Affiliate &amp; Ads Policy
        </Link>
        .
      </p>

      {[
        {
          title: "1. Who can use CurioMap",
          body: "16+ (or your country's higher minimum digital-consent age). Minors below that use CurioMap only with a parent or guardian's consent and supervision. Accounts are personal: one per person, you are responsible for all activity under yours.",
        },
        {
          title: "2. Acceptable use",
          body: "No harassment, hate, illegal content, malware, scraping at scale, or attempts to deanonymize other readers or defeat location fuzzing (correlating fuzzed dots to infer a precise location is a direct violation). Automated filters plus human moderation (reports → admin queue) enforce this; we may remove content or suspend accounts.",
        },
        {
          title: "3. Your content",
          body: "You keep ownership of what you write. You grant CurioMap a worldwide, royalty-free, non-exclusive license to host, store, and display it for operating and promoting the service — nothing broader. Public bookshelves, messages, circles and profiles are visible to the internet; mark entries or your profile private to restrict. Rights holders can request takedowns (DMCA/DSA-style process).",
        },
        {
          title: "4. Affiliate links (no ads)",
          body: "“Buy this book” buttons are ISBN-based affiliate links; buying through them pays CurioMap a commission at no extra cost to you. No third-party tracking ads. See the Affiliate & Ads Policy.",
        },
        {
          title: "5. Open source",
          body: "The source code is Apache 2.0 — these Terms do not reduce your code-license rights. The CurioMap name/logo/design are not licensed for reuse beyond identifying the project.",
        },
        {
          title: "6. Availability and termination",
          body: "The service is provided as-is, with no SLA; features may change or end. You can stop anytime and request account deletion. We may suspend or terminate accounts that breach these Terms — with a warning where practicable.",
        },
        {
          title: "7. Disclaimers (as is)",
          body: "No warranties of any kind to the maximum extent the law allows: the service may be interrupted, and content (including third-party book data) may be incomplete or inaccurate. Map coordinates are intentionally imprecise (~15 km fuzz) — approximations by design.",
        },
        {
          title: "8. Limitation of liability",
          body: "Our aggregate liability is capped at EUR 50 (or what you paid us in the last 12 months — typically zero). No indirect or consequential damages. This does not limit liability for negligence causing death/personal injury, fraud, or anything else the law does not allow us to limit — and as a consumer you keep every mandatory statutory right.",
        },
        {
          title: "9. Indemnity",
          body: "You cover claims arising from your own content, breach, or identity/location misrepresentation — except where the claim results from our own breach, negligence, or misconduct.",
        },
        {
          title: "10. Third-party services",
          body: "Book catalog (Open Library), geocoding (Open-Meteo), hosting (Fly/Neon/Upstash), and bookstore affiliates are third parties with their own terms. We send them the minimum needed (e.g. a city name — never your email or credentials) and degrade gracefully when they fail.",
        },
        {
          title: "11. Governing law & disputes",
          body: "Estonian law governs. Disputes go to amicable resolution first, then arbitration in Tallinn (English, one arbitrator). If you are an EU consumer, you may instead sue in your country of residence under its mandatory consumer law and use the EU ODR platform. The class-action waiver applies only where local law permits.",
        },
        {
          title: "12. Changes to these Terms",
          body: "Material changes are announced in-app at least 14 days before taking effect. Continued use after that = acceptance. If you disagree, delete your account. Nothing here reduces your statutory consumer, data-protection (GDPR, LGPD, CCPA/CPRA, PIPEDA, etc.), or platform rights.",
        },
        {
          title: "13. Contact",
          body: "security@curiomap.app (security & legal), conduct@curiomap.app (conduct reports), or an issue on the public repository.",
        },
      ].map((section) => (
        <section key={section.title} className="glass mt-4 p-5">
          <h2 className="font-semibold text-ink">{section.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{section.body}</p>
        </section>
      ))}

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        This page is a summary for readability. Where wording differs, the formal
        text in <code>docs/terms-of-use.md</code> (version-controlled with the
        code) is the binding version between you and the CurioMap maintainers.
      </p>
    </div>
  );
}
