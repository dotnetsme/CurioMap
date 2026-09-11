export interface CurioAvatar {
  id: string;
  glyph: string;
  from: string;
  to: string;
}

/**
 * Curated avatar set — no uploads at launch (moderation-free by design).
 * Must stay in sync with CurioAvatars in the API (ids curio-01 … curio-24).
 */
export const AVATARS: CurioAvatar[] = [
  { id: "curio-01", glyph: "🦉", from: "#6366f1", to: "#8b5cf6" },
  { id: "curio-02", glyph: "🦊", from: "#f97316", to: "#ef4444" },
  { id: "curio-03", glyph: "🐺", from: "#64748b", to: "#334155" },
  { id: "curio-04", glyph: "🦅", from: "#0ea5e9", to: "#6366f1" },
  { id: "curio-05", glyph: "🦦", from: "#14b8a6", to: "#0ea5e9" },
  { id: "curio-06", glyph: "🐋", from: "#3b82f6", to: "#06b6d4" },
  { id: "curio-07", glyph: "🐙", from: "#a855f7", to: "#ec4899" },
  { id: "curio-08", glyph: "🦋", from: "#22d3ee", to: "#a78bfa" },
  { id: "curio-09", glyph: "🌙", from: "#4f46e5", to: "#7c3aed" },
  { id: "curio-10", glyph: "⭐", from: "#f59e0b", to: "#f97316" },
  { id: "curio-11", glyph: "☄️", from: "#ef4444", to: "#f59e0b" },
  { id: "curio-12", glyph: "🚀", from: "#8b5cf6", to: "#22d3ee" },
  { id: "curio-13", glyph: "🔭", from: "#1d4ed8", to: "#7c3aed" },
  { id: "curio-14", glyph: "🧭", from: "#f59e0b", to: "#10b981" },
  { id: "curio-15", glyph: "📖", from: "#10b981", to: "#14b8a6" },
  { id: "curio-16", glyph: "✒️", from: "#6b7280", to: "#a855f7" },
  { id: "curio-17", glyph: "🪶", from: "#e2e8f0", to: "#94a3b8" },
  { id: "curio-18", glyph: "🕯️", from: "#fbbf24", to: "#f97316" },
  { id: "curio-19", glyph: "🪴", from: "#22c55e", to: "#84cc16" },
  { id: "curio-20", glyph: "🍄", from: "#ef4444", to: "#a855f7" },
  { id: "curio-21", glyph: "🌊", from: "#06b6d4", to: "#3b82f6" },
  { id: "curio-22", glyph: "🍂", from: "#d97706", to: "#dc2626" },
  { id: "curio-23", glyph: "❄️", from: "#67e8f9", to: "#818cf8" },
  { id: "curio-24", glyph: "🌱", from: "#34d399", to: "#22d3ee" },
];

export function avatarById(id: string | null | undefined): CurioAvatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
