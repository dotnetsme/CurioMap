import type { BookStub } from "./book";

export type BookStatus = "reading" | "finished" | "wishlist";
export type ShelfVisibility = "public" | "private";

export interface BookshelfEntry {
  id: string;
  bookId: string;
  book: BookStub;
  status: BookStatus;
  visibility: ShelfVisibility;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AddBookshelfPayload {
  bookId: string;
  status: BookStatus;
  visibility?: ShelfVisibility;
}

export interface UpdateBookshelfPayload {
  status?: BookStatus;
  visibility?: ShelfVisibility;
}
