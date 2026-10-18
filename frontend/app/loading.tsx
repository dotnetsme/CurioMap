export default function GlobalLoading() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-line animate-ping opacity-25" />
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
      <p className="font-mono text-xs font-medium tracking-wider uppercase text-ink-faint">
        Gathering curious minds…
      </p>
    </div>
  );
}
