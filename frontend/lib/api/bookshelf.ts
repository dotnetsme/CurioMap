import { api } from "./http";
import type { AddBookshelfPayload, BookshelfEntry, UpdateBookshelfPayload } from "@/types";

export function myShelf(): Promise<BookshelfEntry[]> {
  return api("/bookshelf/me");
}

export function publicShelf(userId: string): Promise<BookshelfEntry[]> {
  return api(`/users/${userId}/bookshelf`, { auth: false });
}

export function add(payload: AddBookshelfPayload): Promise<BookshelfEntry> {
  return api("/bookshelf", { method: "POST", body: JSON.stringify(payload) });
}

export function update(entryId: string, payload: UpdateBookshelfPayload): Promise<BookshelfEntry> {
  return api(`/bookshelf/${entryId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function remove(entryId: string): Promise<void> {
  return api(`/bookshelf/${entryId}`, { method: "DELETE" });
}
