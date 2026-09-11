"use client";

import { AVATARS } from "@/lib/avatars";
import { Avatar } from "./Avatar";

export function AvatarSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          onClick={() => onChange(avatar.id)}
          className={`cursor-pointer rounded-xl p-1 transition ${
            value === avatar.id
              ? "bg-accent-soft ring-2 ring-accent"
              : "hover:bg-surface-2"
          }`}
          aria-label={avatar.id}
        >
          <Avatar avatarId={avatar.id} size={36} />
        </button>
      ))}
    </div>
  );
}
