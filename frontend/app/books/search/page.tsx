import { SearchPageClient } from "@/components/books/SearchPageClient";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ searchParams: Promise<URLSearchParams> }>;
}) {
  const { searchParams } = await params;
  const sp = (await searchParams) ?? new URLSearchParams();
  return (
    <SearchPageClient
      key={sp.get("q") ?? ""}
      initialQuery={sp.get("q") ?? ""}
    />
  );
}