const toneClasses: Record<string, string> = {
  accent: "bg-accent/15 text-accent border-accent/30",
  reading: "bg-signal/15 text-signal border-signal/30",
  violet: "bg-accent/15 text-accent border-accent/30",
  cyan: "bg-signal/15 text-signal border-signal/30",
  slate: "bg-white/5 text-ink-muted border-line",
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${toneClasses[tone] ?? toneClasses.slate}`}
    >
      {children}
    </span>
  );
}
