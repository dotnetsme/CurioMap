import { CircleDetail } from "@/components/circles/CircleDetail";

export default function CirclePage({ params }: { params: Promise<{ handle: string }> }) {
  return (
    <div className="py-4">
      <CircleDetail handle={params.then((p) => p.handle)} />
    </div>
  );
}
