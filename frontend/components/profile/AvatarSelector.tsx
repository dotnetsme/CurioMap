"use client";

import { Check } from "lucide-react";
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
    <div
      role="radiogroup"
      aria-label="Choose your curated avatar"
      className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8"
    >
      {AVATARS.map((avatar) => {
        const isSelected = value === avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(avatar.id)}
            className={`group relative inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-2xl p-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isSelected
                ? "bg-accent/20 ring-2 ring-accent scale-105"
                : "hover:bg-fill-2 hover:scale-102 border border-transparent hover:border-line-2"
            }`}
            aria-label={`Avatar ${avatar.id} (${avatar.mark})`}
            title={`Avatar ${avatar.id} (${avatar.mark})`}
          >
            <Avatar avatarId={avatar.id} size={40} />
            {isSelected ? (
              <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
                <Check size={11} strokeWidth={3} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

