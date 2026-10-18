import { ReportsBoard } from "@/components/admin/ReportsBoard";
import { BackfillButton } from "@/components/admin/BackfillButton";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <h1 className="display text-4xl text-ink-strong sm:text-5xl">Moderation</h1>
      <p className="mt-1 text-sm text-ink-muted">Reported messages — review and action.</p>
      <div className="mt-6">
        <ReportsBoard />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Gamification</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Award badges readers already qualify for from their historical data
        (night-owl / early-bird badges are earned live only).
      </p>
      <div className="mt-4">
        <BackfillButton />
      </div>
    </div>
  );
}