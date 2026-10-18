import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  hint,
  action,
  align = "left",
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
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
      <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      <h2
        className={cn(
          "display text-balance text-4xl text-ink-strong sm:text-5xl",
        )}
      >
        {title}
      </h2>
      {hint ? (
        <p className={"max-w-2xl text-lg leading-snug text-ink-muted"}>{hint}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
