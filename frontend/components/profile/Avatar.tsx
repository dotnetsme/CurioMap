import { avatarById } from "@/lib/avatars";
import { AvatarMark } from "./AvatarMark";

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
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})`,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.35), 0 4px 12px -6px rgba(0,0,0,0.55)",
        color: "rgba(255,255,255,0.96)",
      }}
      aria-label={name ?? "reader"}
    >
      <AvatarMark mark={avatar.mark} size={Math.max(12, size * 0.56)} />
    </span>
  );
}
