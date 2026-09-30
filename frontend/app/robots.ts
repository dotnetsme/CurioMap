import type { MetadataRoute } from "next";

/**
 * Dynamic robots rule generator (AGENTS.md §6).
 *
 * Invariants:
 * 1. Non-production deployments MUST NEVER be indexed (User-agent: * / Disallow: /).
 * 2. Strict AI crawler blocklist: GPTBot, Claude-Web, CCBot, PerplexityBot, etc.
 * 3. Production indexable scope is strictly limited to public doorway pages
 *    (/, /policy/*, /books/search, /books/*).
 * 4. User profiles, circle discussions, and discovery heatmaps are private
 *    and MUST NOT be indexed to protect pseudonymous reader identities.
 */
export default function robots(): MetadataRoute.Robots {
  const allowIndexing =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://curiomap.app";

  if (!allowIndexing) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "CCBot",
    "anthropic-ai",
    "Claude-Web",
    "Google-Extended",
    "Bytespider",
    "Diffbot",
    "PerplexityBot",
    "Amazonbot",
  ];

  return {
    rules: [
      ...aiBots.map((bot) => ({
        userAgent: bot,
        disallow: ["/"],
      })),
      {
        userAgent: "*",
        allow: [
          "/",
          "/policy/terms",
          "/policy/privacy",
          "/policy/affiliates",
          "/books/search",
          "/books/",
        ],
        disallow: [
          "/home",
          "/me",
          "/feed",
          "/discover",
          "/circles",
          "/users",
          "/admin",
          "/auth",
          "/api",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
