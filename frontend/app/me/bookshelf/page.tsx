"use client";

import { LibraryBig } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { BookshelfList } from "@/components/bookshelf/BookshelfList";

export default function MyBookshelfPage() {
  return (
    <AuthGate
      icon={LibraryBig}
      title="My bookshelf"
      body="Sign in to shelve books and put your city on the curiosity map."
    >
      <div className="flex flex-col gap-4 py-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">My bookshelf</h1>
        <BookshelfList />
      </div>
    </AuthGate>
  );
}
