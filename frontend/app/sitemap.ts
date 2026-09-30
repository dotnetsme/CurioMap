import type { MetadataRoute } from "next";

/**
 * Sitemap discipline (AGENTS.md §6.5):
 * Emits strictly public doorway pages (/, /books/search, /policy/*).
 *
 * MUST NEVER emit user profiles (/users/*), circles (/circles/*),
 * conversations, or discovery heatmaps (/discover/*) to prevent scraping
 * of pseudonymous reader identities and fuzzed locations.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://curiomap.app";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/books/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/policy/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policy/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policy/affiliates`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
