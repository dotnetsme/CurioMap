import { Avatar } from "@/components/profile/Avatar";

export function AvatarStack({
  avatars,
  size = 28,
  max = 5,
}: {
  avatars: { avatarId: string; name?: string }[];
  size?: number;
  max?: number;
}) {
  const shown = avatars.slice(0, max);
  const extra = avatars.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((a, i) => (
        <span key={i} className="-ml-2 first:ml-0 rounded-full ring-2 ring-surface" style={{ zIndex: shown.length - i }}>
          <Avatar avatarId={a.avatarId} name={a.name} size={size} />
        </span>
      ))}
      {extra > 0 ? (
        <span
          className="-ml-2 flex items-center justify-center rounded-full bg-ink text-[10px] font-bold text-surface ring-2 ring-surface"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
