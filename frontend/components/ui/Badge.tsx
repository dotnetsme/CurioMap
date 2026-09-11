const toneClasses: Record<string, string> = {
  accent: "bg-accent-soft text-accent-strong border-accent/30",
  reading: "bg-reading-soft text-reading border-reading/30",
  violet: "bg-violet/10 text-violet border-violet/30",
  cyan: "bg-cyan/10 text-cyan border-cyan/30",
  slate: "bg-surface-2 text-ink-2 border-line",
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
