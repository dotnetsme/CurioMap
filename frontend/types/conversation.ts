import type { BookStub } from "./book";
import type { UserStub } from "./user";

export type TopicType = "general" | "chapter" | "theme" | "question";

export interface Conversation {
  id: string;
  bookId: string | null;
  draftId: string | null;
  topicType: TopicType;
  title: string;
  promptKey: string | null;
  createdBy: UserStub;
  isArchived: boolean;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
  book: BookStub | null;
  topic?: string | null;
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateConversationPayload {
  title: string;
  topicType: TopicType;
  promptKey?: string;
  topic?: string;
  bookId?: string;
}
