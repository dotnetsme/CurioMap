import type { ReactNode } from "react";

export function Card({
  className = "",
  children,
  hover = false,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={`card p-5 ${hover ? "card-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{children}</h2>
        {hint ? <span className="mt-0.5 block text-xs text-ink-3">{hint}</span> : null}
      </div>
      {action ?? null}
    </div>
  );
}

export function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="mono-label text-ink-3">{label}</div>
      <div className="stat-num mt-1">{value}</div>
      {hint ? <div className="mt-1 text-xs text-ink-3">{hint}</div> : null}
    </div>
  );
}
