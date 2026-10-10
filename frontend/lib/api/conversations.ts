import { api } from "./http";
import type {
  Conversation,
  ConversationListResponse,
  CreateConversationPayload,
  MessagesPage,
} from "@/types";

export function list(
  opts: { topic?: string; includeArchived?: boolean; limit?: number; offset?: number } = {},
): Promise<ConversationListResponse> {
  const q = new URLSearchParams();
  if (opts.topic) q.set("topic", opts.topic);
  if (opts.includeArchived) q.set("includeArchived", "true");
  q.set("limit", String(opts.limit ?? 30));
  q.set("offset", String(opts.offset ?? 0));
  return api(`/conversations?${q.toString()}`, { auth: false });
}

export function listForBook(
  bookId: string,
  opts: { includeArchived?: boolean; limit?: number; offset?: number } = {},
): Promise<ConversationListResponse> {
  const q = new URLSearchParams();
  if (opts.includeArchived) q.set("includeArchived", "true");
  q.set("limit", String(opts.limit ?? 30));
  q.set("offset", String(opts.offset ?? 0));
  return api(`/books/${bookId}/conversations?${q.toString()}`, { auth: false });
}

export function create(bookId: string, payload: CreateConversationPayload): Promise<Conversation> {
  return api(`/books/${bookId}/conversations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createSalon(payload: CreateConversationPayload): Promise<Conversation> {
  return api("/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function get(id: string): Promise<Conversation> {
  return api(`/conversations/${id}`, { auth: false });
}

export function listMessages(
  id: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<MessagesPage> {
  return api(`/conversations/${id}/messages?limit=${opts.limit ?? 50}&offset=${opts.offset ?? 0}`, {
    auth: false,
  });
}

export function postMessage(id: string, content: string) {
  return api(`/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
