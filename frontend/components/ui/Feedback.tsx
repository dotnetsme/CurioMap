export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-heat-hot/40 bg-heat-hot/10 p-4 text-sm text-ink"
    >
      {message}
    </div>
  );
}
