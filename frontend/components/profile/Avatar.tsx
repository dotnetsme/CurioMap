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
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold shadow-inner"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})`,
      }}
      aria-label={name ?? "reader"}
    >
      {avatar.glyph}
    </span>
  );
}
