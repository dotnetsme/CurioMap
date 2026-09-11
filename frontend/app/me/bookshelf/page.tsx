"use client";

import { BookshelfList } from "@/components/bookshelf/BookshelfList";

export default function MyBookshelfPage() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-2xl font-bold text-white">My bookshelf</h1>
      <BookshelfList />
    </div>
  );
}
