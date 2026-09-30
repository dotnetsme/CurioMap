import { AlertTriangle, Compass, LoaderCircle } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <LoaderCircle
      className={`animate-spin text-accent ${className}`}
      size={20}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoading() {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center gap-4 py-16"
      role="status"
      aria-live="polite"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-accent/10">
        <Spinner />
      </span>
      <span className="text-sm text-ink-muted">
        Loading your reading space…
      </span>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Compass,
  title,
  hint,
  action,
}: {
  icon?: typeof Compass;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-signal/10 text-signal">
        <Icon size={20} />
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-ink">
        {title}
      </p>
      {hint ? (
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-heat-hot/40 bg-heat-hot/10 p-4 text-sm text-ink"
    >
      <AlertTriangle className="mt-0.5 shrink-0 text-heat-hot" size={18} />
      <div className="min-w-0">
        <p>{message}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
