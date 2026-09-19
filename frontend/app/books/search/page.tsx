import { SearchPageClient } from "@/components/books/SearchPageClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const query = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return <SearchPageClient key={query ?? ""} initialQuery={query ?? ""} />;
}
