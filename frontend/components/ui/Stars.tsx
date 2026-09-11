"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  max = 5,
  size = 15,
  onRate,
  className = "",
}: {
  value: number;
  max?: number;
  size?: number;
  onRate?: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="img" aria-label={`${value} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        const star = (
          <Star
            size={size}
            strokeWidth={filled ? 0 : 1.8}
            className={filled ? "fill-amber-400 text-amber-400" : "text-ink-3"}
            aria-hidden
          />
        );
        return onRate ? (
          <button
            key={i}
            type="button"
            onClick={() => onRate(i + 1)}
            className="cursor-pointer rounded p-0.5 transition hover:scale-125"
            aria-label={`Rate ${i + 1} star${i > 0 ? "s" : ""}`}
          >
            {star}
          </button>
        ) : (
          <span key={i} className="p-0.5">
            {star}
          </span>
        );
      })}
    </div>
  );
}
