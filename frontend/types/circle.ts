import type { BookStub } from "./book";
import type { UserStub } from "./user";
import type { ReactionSummary } from "./message";

export type CircleRole = "member" | "moderator";

export interface Circle {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  book: BookStub | null;
  maxMembers: number | null;
  nextMeetingAt: string | null;
  createdBy: UserStub;
  memberCount: number;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface CircleMember {
  userId: string;
  handle: string;
  avatarId: string;
  displayName: string;
  isAuthor: boolean;
  role: CircleRole;
  joinedAt: string;
}

export interface CircleMessage {
  id: string;
  circleId: string;
  author: UserStub;
  content: string;
  status: string;
  createdAt: string;
  reactions: ReactionSummary[];
}

export interface CircleDetail extends Circle {
  members: CircleMember[];
  recentMessages: CircleMessage[];
}

export interface CircleListResponse {
  items: Circle[];
  total: number;
  limit: number;
  offset: number;
}

export interface CircleMessagesPage {
  items: CircleMessage[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateCirclePayload {
  name: string;
  description?: string;
  bookId?: string;
  maxMembers?: number;
  nextMeetingAt?: string;
}

export interface CreateCircleMessagePayload {
  content: string;
}
