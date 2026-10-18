import type { ComponentType, ReactNode } from "react";

/**
 * Consistent dashboard panel: icon + title (+ hint) header, optional action link,
 * then the panel body. Keeps the three bottom-row dashboards visually aligned.
 */
export function DashboardPanel({
  icon: Icon,
  title,
  hint,
  action,
  children,
  className = "",
}: {
  icon: ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // min-w-0: as a grid item the panel must be allowed to shrink, or the truncating hint widens the page.
    <section className={`card flex h-full min-w-0 flex-col p-5 ${className}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-[15px] font-semibold text-ink">{title}</h2>
            {hint ? <p className="truncate text-xs text-ink-faint">{hint}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
