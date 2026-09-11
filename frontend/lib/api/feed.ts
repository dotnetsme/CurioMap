import { api } from "./http";
import type { FeedPage } from "@/types";

export function feed(limit = 30, offset = 0): Promise<FeedPage> {
  return api(`/feed?limit=${limit}&offset=${offset}`);
}
