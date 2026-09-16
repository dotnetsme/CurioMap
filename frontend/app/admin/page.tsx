import { ReportsBoard } from "@/components/admin/ReportsBoard";
import { BackfillButton } from "@/components/admin/BackfillButton";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <h1 className="text-2xl font-bold text-white">Moderation</h1>
      <p className="mt-1 text-sm text-slate-400">Reported messages — review and action.</p>
      <div className="mt-6">
        <ReportsBoard />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white">Gamification</h2>
      <p className="mt-1 text-sm text-slate-400">
        Award badges readers already qualify for from their historical data
        (night-owl / early-bird badges are earned live only).
      </p>
      <div className="mt-4">
        <BackfillButton />
      </div>
    </div>
  );
}