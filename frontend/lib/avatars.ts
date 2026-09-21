export type AvatarMarkId =
  | "orbit"
  | "star"
  | "leaf"
  | "wave"
  | "flame"
  | "moon"
  | "bolt"
  | "prism"
  | "book"
  | "compass"
  | "feather"
  | "crystal";

export interface CurioAvatar {
  id: string;
  /** Vector mark rendered inside the gradient chip (no raw emoji — crisp on every platform). */
  mark: AvatarMarkId;
  from: string;
  to: string;
}

/**
 * Curated avatar set — no uploads at launch (moderation-free by design).
 * Must stay in sync with CurioAvatars in the API (ids curio-01 … curio-24).
 * Gradients tuned for the Observatory dark stage (bright → deep, never pastel).
 */
export const AVATARS: CurioAvatar[] = [
  { id: "curio-01", mark: "orbit", from: "#6366f1", to: "#8b5cf6" },
  { id: "curio-02", mark: "flame", from: "#f97316", to: "#ef4444" },
  { id: "curio-03", mark: "moon", from: "#64748b", to: "#334155" },
  { id: "curio-04", mark: "star", from: "#0ea5e9", to: "#6366f1" },
  { id: "curio-05", mark: "wave", from: "#14b8a6", to: "#0ea5e9" },
  { id: "curio-06", mark: "prism", from: "#3b82f6", to: "#06b6d4" },
  { id: "curio-07", mark: "crystal", from: "#a855f7", to: "#ec4899" },
  { id: "curio-08", mark: "bolt", from: "#22d3ee", to: "#a78bfa" },
  { id: "curio-09", mark: "moon", from: "#4f46e5", to: "#7c3aed" },
  { id: "curio-10", mark: "star", from: "#f59e0b", to: "#f97316" },
  { id: "curio-11", mark: "bolt", from: "#ef4444", to: "#f59e0b" },
  { id: "curio-12", mark: "orbit", from: "#8b5cf6", to: "#22d3ee" },
  { id: "curio-13", mark: "prism", from: "#1d4ed8", to: "#7c3aed" },
  { id: "curio-14", mark: "compass", from: "#f59e0b", to: "#10b981" },
  { id: "curio-15", mark: "book", from: "#10b981", to: "#14b8a6" },
  { id: "curio-16", mark: "feather", from: "#7c3aed", to: "#a855f7" },
  { id: "curio-17", mark: "feather", from: "#94a3b8", to: "#64748b" },
  { id: "curio-18", mark: "flame", from: "#fbbf24", to: "#f97316" },
  { id: "curio-19", mark: "leaf", from: "#22c55e", to: "#84cc16" },
  { id: "curio-20", mark: "crystal", from: "#ef4444", to: "#a855f7" },
  { id: "curio-21", mark: "wave", from: "#06b6d4", to: "#3b82f6" },
  { id: "curio-22", mark: "leaf", from: "#d97706", to: "#dc2626" },
  { id: "curio-23", mark: "star", from: "#67e8f9", to: "#818cf8" },
  { id: "curio-24", mark: "leaf", from: "#34d399", to: "#22d3ee" },
];

export function avatarById(id: string | null | undefined): CurioAvatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
