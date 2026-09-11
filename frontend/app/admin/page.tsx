import { ReportsBoard } from "@/components/admin/ReportsBoard";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <h1 className="text-2xl font-bold text-white">Moderation</h1>
      <p className="mt-1 text-sm text-slate-400">Reported messages — review and action.</p>
      <div className="mt-6">
        <ReportsBoard />
      </div>
    </div>
  );
}