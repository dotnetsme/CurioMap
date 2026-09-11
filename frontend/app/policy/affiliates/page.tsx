export default function AffiliatesPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="text-2xl font-bold text-white">Affiliate &amp; Ads Policy</h1>
      <p className="mt-2 text-sm text-slate-400">
        Financing CurioMap without selling you out.
      </p>

      {[
        {
          title: "Affiliate links",
          body: "“Buy this book” buttons are generated from the book's ISBN and an affiliate tag. If you buy through them, the bookstore pays CurioMap a small commission — at no extra cost to you. Links are clearly labeled and always disclose the arrangement (`rel=sponsored nofollow`).",
        },
        {
          title: "No ads (yet)",
          body: "Ads are not shipped in the MVP. If topic-based, non-intrusive ads are introduced later, they will be server-side controlled, never based on tracking you across the web, and always accompanied by a clear disclosure.",
        },
        {
          title: "No data selling",
          body: "We will never sell or provide your personal data, reading history, or location to advertisers. Aggregated, region-level statistics (like “most read book in Berlin this week”) may be shared, but never individual data.",
        },
        {
          title: "Revenue goes to operations",
          body: "All proceeds fund hosting, the PostgreSQL/Redis infrastructure, and development. Figures are shared publicly in our build-in-public dev logs — including affiliate click counts, even when they're tiny.",
        },
      ].map((section) => (
        <section key={section.title} className="glass mt-4 p-5">
          <h2 className="font-semibold text-white">{section.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{section.body}</p>
        </section>
      ))}
    </div>
  );
}