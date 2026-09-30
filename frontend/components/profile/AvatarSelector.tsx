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
          className={`min-h-11 min-w-11 inline-flex items-center justify-center cursor-pointer rounded-xl p-1 transition ${
            value === avatar.id
              ? "bg-accent/20 ring-2 ring-accent shadow-[0_0_12px_rgba(139,92,246,0.3)]"
              : "hover:bg-white/5"
          }`}
          aria-label={avatar.id}
        >
          <Avatar avatarId={avatar.id} size={36} />
        </button>
      ))}
    </div>
  );
}
