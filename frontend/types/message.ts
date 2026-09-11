import type { UserStub } from "./user";

export type ReactionKind = "insightful" | "funny" | "helpful";
export type MessageStatus = "visible" | "muted" | "deleted";

export interface ReactionSummary {
  kind: ReactionKind;
  count: number;
  reactedByMe: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  author: UserStub;
  content: string;
  status: MessageStatus;
  createdAt: string;
  reactions: ReactionSummary[];
}

export interface MessagesPage {
  items: Message[];
  total: number;
  limit: number;
  offset: number;
}
