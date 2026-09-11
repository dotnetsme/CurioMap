import { cn } from "@/lib/utils";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}

export function BookCardSkeleton() {
  return (
    <div className="card flex gap-4 p-4">
      <Skeleton className="h-[84px] w-14 shrink-0" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function ReaderCardSkeleton() {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
}
