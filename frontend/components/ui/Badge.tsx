const toneClasses: Record<string, string> = {
  accent: "bg-accent-soft text-accent border-transparent",
  reading: "bg-signal-soft text-signal border-transparent",
  violet: "bg-accent-soft text-accent border-transparent",
  cyan: "bg-signal-soft text-signal border-transparent",
  slate: "bg-fill text-ink-muted border-transparent",
};

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: keyof typeof toneClasses | string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone] ?? toneClasses.slate}`}
    >
      {children}
    </span>
  );
}
