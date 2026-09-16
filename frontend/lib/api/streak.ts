import { api } from "./http";
import type { StreakCalendar, StreakLeaderboardEntry, StreakStats } from "@/types";

export function getStreak(): Promise<StreakStats> {
  return api("/me/streak");
}

export function getMyStreakCalendar(days = 91): Promise<StreakCalendar> {
  return api(`/me/streak/calendar?days=${days}`);
}

export function getStreakForUser(userId: string): Promise<StreakStats> {
  return api(`/users/${userId}/streak`);
}

export function getStreakCalendar(userId: string, days = 91): Promise<StreakCalendar> {
  return api(`/users/${userId}/streak/calendar?days=${days}`);
}

export function getStreakLeaderboard(): Promise<StreakLeaderboardEntry[]> {
  return api("/streaks/leaderboard");
}