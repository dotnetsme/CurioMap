import type { UserStub } from "./user";

export interface FeedBook {
  id: string;
  title: string;
  coverUrl: string | null;
}

export interface FeedConversation {
  id: string;
  title: string;
}

export interface FeedEvent {
  id: string;
  type: "bookshelf_added" | "conversation_created" | "message_posted" | string;
  actor: UserStub;
  book: FeedBook | null;
  conversation: FeedConversation | null;
  messageExcerpt: string | null;
  shelfStatus: string | null;
  createdAt: string;
}

export interface FeedPage {
  items: FeedEvent[];
  nextOffset: number | null;
}

export interface AdminReport {
  id: string;
  messageId: string;
  conversationId: string;
  messageContent: string;
  messageStatus: string;
  author: UserStub;
  reporter: UserStub;
  reason: string;
  status: "open" | "resolved_actioned" | "resolved_dismissed" | string;
  createdAt: string;
}
