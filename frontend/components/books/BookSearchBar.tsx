"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function BookSearchBar({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/books/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, author, or ISBN…"
        aria-label="Search books"
      />
      <Button type="submit" className="w-full sm:w-auto">
        Search
      </Button>
    </form>
  );
}
