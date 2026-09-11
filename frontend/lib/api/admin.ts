import { api } from "./http";
import type { AdminReport } from "@/types";

export function reports(status: string = "open"): Promise<AdminReport[]> {
  return api(`/admin/reports?status=${encodeURIComponent(status)}`);
}

export function resolve(
  reportId: string,
  action: "dismiss" | "remove_message" | "mute_message",
): Promise<{ success: boolean; status: string }> {
  return api(`/admin/reports/${reportId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
