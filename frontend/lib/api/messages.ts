import { api } from "./http";
import type { Message, ReactionKind, ReactionSummary } from "@/types";

export function report(messageId: string, reason: string): Promise<{ id: string; status: string }> {
  return api(`/messages/${messageId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function setStatus(messageId: string, status: string): Promise<Message> {
  return api(`/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function react(messageId: string, kind: ReactionKind): Promise<{ reactions: ReactionSummary[] }> {
  return api(`/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export function unreact(messageId: string, kind: ReactionKind): Promise<{ reactions: ReactionSummary[] }> {
  return api(`/messages/${messageId}/reactions?kind=${kind}`, { method: "DELETE" });
}
