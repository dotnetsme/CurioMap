import { api } from "./http";

export function follow(userId: string): Promise<{ following: boolean }> {
  return api(`/follow/${userId}`, { method: "POST" });
}

export function unfollow(userId: string): Promise<{ following: boolean }> {
  return api(`/follow/${userId}`, { method: "DELETE" });
}
