import { avatarById } from "@/lib/avatars";

export function Avatar({
  avatarId,
  name,
  size = 40,
}: {
  avatarId: string;
  name?: string;
  size?: number;
}) {
  const avatar = avatarById(avatarId);
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})`,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
        color: "white",
      }}
      aria-label={name ?? "reader"}
    >
      {avatar.glyph}
    </span>
  );
}
