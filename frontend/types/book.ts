export interface BookStub {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
}

export interface Book extends BookStub {
  description: string | null;
  affiliateLinks: Record<string, string>;
  metadata: Record<string, string>;
  readersCount: number;
  conversationsCount: number;
  createdAt: string;
}

export interface SearchResponse {
  items: Book[];
  total: number;
  fromExternal: boolean;
}

export interface TopBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  readerCount: number;
}
