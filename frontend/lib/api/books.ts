import { api } from "./http";
import type { Book, SearchResponse } from "@/types";

export function search(q: string, limit = 20, offset = 0): Promise<SearchResponse> {
  return api(`/books/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`, {
    auth: false,
  });
}

export function getBook(id: string): Promise<Book> {
  return api(`/books/${id}`, { auth: false });
}

export function importBook(isbn: string): Promise<Book> {
  return api("/books/import", { method: "POST", body: JSON.stringify({ isbn }) });
}
