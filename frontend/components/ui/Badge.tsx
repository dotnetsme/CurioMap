const toneClasses: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  slate: "bg-white/5 text-slate-300 border-white/10",
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
