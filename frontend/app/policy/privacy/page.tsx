export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="display text-4xl text-ink-strong sm:text-5xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-muted">
        CurioMap is <strong>privacy-first by architecture</strong>, not by policy note.
        Here is exactly what we store and why.
      </p>

      {[
        {
          title: "What we store about you",
          body: "Email (only for sign-in), a generated handle, a curated avatar id, and optional bio/real name. That's it. No phone numbers, no tracking pixels, no device fingerprints, no third-party ad SDKs.",
        },
        {
          title: "We never store exact location",
          body: "You can set country, region, and city. When coordinates are needed (for the map), they are resolved from your city name and immediately fuzzed to a ~15 km grid — the imprecise value is all that's ever persisted or served.",
        },
        {
          title: "Location visibility is granular",
          body: "Choose between country-only, region & city, or full opt-out from discovery. You can change this at any time from Settings. Opting out removes you from nearby and the global heatmap entirely.",
        },
        {
          title: "Public profiles never include",
          body: "Your email, your exact coordinates, your private bookshelf entries, or anything you marked private. An anonymous-mode profile shows a generic label, not your hand-chosen handle, until you switch modes.",
        },
        {
          title: "Data retention",
          body: "Conversations auto-archive after 30 days of inactivity (they become read-only). You can delete your account yourself under Settings → Delete account (your profile, shelf and everything you posted are removed; threads others replied to stay, shown as “deleted_reader”); we retain no analytics beyond aggregate region counters needed to render the map.",
        },
        {
          title: "What we do NOT do",
          body: "We do not sell user data. We do not build advertising profiles. We do not share reading history with third parties. Affiliate links include a tag to fund operations — see the Affiliate & Ads Policy.",
        },
      ].map((section) => (
        <section key={section.title} className="glass mt-4 p-5">
          <h2 className="font-semibold text-ink">{section.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{section.body}</p>
        </section>
      ))}
    </div>
  );
}