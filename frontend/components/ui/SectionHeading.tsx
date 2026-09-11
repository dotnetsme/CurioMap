import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  hint,
  action,
  align = "left",
  dark = false,
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <p className={cn("label-sm", dark ? "text-amber-300" : "text-accent-strong")}>{eyebrow}</p>
      <h2
        className={cn(
          "font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
          dark ? "text-amber-50" : "text-ink",
        )}
      >
        {title}
      </h2>
      {hint ? (
        <p className={cn("max-w-2xl text-[15px] leading-relaxed", dark ? "text-amber-100/60" : "text-ink-muted")}>{hint}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
