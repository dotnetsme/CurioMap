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

export interface RatingStats {
  average: number;
  count: number;
  ratedByCurrentUser: boolean;
}

export function getRatingStats(bookId: string): Promise<RatingStats> {
  return api(`/books/${bookId}/rating`, { auth: false });
}

export function rateBook(bookId: string, value: number): Promise<RatingStats> {
  return api(`/books/${bookId}/rating`, { method: "PUT", body: JSON.stringify({ value }) });
}
