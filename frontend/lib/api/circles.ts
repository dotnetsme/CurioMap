import { api } from "./http";
import type {
  Circle,
  CircleDetail,
  CircleListResponse,
  CircleMessagesPage,
  CircleMessage,
  CircleStreakStats,
  CreateCirclePayload,
} from "@/types";

export function getCircleStreak(handleOrId: string): Promise<CircleStreakStats> {
  return api(`/circles/${handleOrId}/streak`, { auth: false });
}

export function listCircles(
  opts: { q?: string; bookId?: string; sort?: string; limit?: number; offset?: number } = {},
): Promise<CircleListResponse> {
  const q = new URLSearchParams();
  if (opts.q) q.set("q", opts.q);
  if (opts.bookId) q.set("bookId", opts.bookId);
  if (opts.sort) q.set("sort", opts.sort);
  q.set("limit", String(opts.limit ?? 30));
  q.set("offset", String(opts.offset ?? 0));
  return api(`/circles?${q.toString()}`, { auth: false });
}

export function getCircle(handle: string): Promise<CircleDetail> {
  return api(`/circles/${handle}`, { auth: false });
}

export function createCircle(payload: CreateCirclePayload): Promise<Circle> {
  return api("/circles", { method: "POST", body: JSON.stringify(payload) });
}

export function joinCircle(handle: string): Promise<void> {
  return api(`/circles/${handle}/join`, { method: "POST" });
}

export function leaveCircle(handle: string): Promise<void> {
  return api(`/circles/${handle}/leave`, { method: "POST" });
}

export function listCircleMessages(
  handle: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<CircleMessagesPage> {
  return api(
    `/circles/${handle}/messages?limit=${opts.limit ?? 50}&offset=${opts.offset ?? 0}`,
    { auth: false },
  );
}

export function postCircleMessage(handle: string, content: string): Promise<CircleMessage> {
  return api(`/circles/${handle}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function reactToCircleMessage(
  handle: string,
  messageId: string,
  kind: string,
): Promise<{ reactions: { kind: string; count: number; reactedByMe: boolean }[] }> {
  return api(`/circles/${handle}/messages/${messageId}/react`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export function archiveCircle(handle: string): Promise<void> {
  return api(`/circles/${handle}`, { method: "DELETE" });
}
