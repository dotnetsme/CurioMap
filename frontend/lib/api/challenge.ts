import { api } from "./http";

export interface ChallengeStats {
  year: number;
  target: number;
  finished: number;
  average: number;
  aheadOfPace: boolean;
  pct: number;
}

export function getChallengeStats(year?: number): Promise<ChallengeStats> {
  const qs = year ? `?year=${year}` : "";
  return api(`/me/challenge${qs}`);
}

export function setChallengeTarget(target: number, year?: number): Promise<ChallengeStats> {
  const qs = year ? `?year=${year}` : "";
  return api(`/me/challenge${qs}`, {
    method: "PUT",
    body: JSON.stringify({ target }),
  });
}
