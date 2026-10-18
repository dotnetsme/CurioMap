"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-boundary errors for diagnosis
    console.error("Uncaught route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-heat-hot/40 bg-heat-hot/10 text-heat-hot">
        <AlertCircle size={32} />
      </div>

      <h1 className="display text-3xl text-ink-strong">
        Something flickered in the dark
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {error.message || "An unexpected error occurred while loading this view."}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()} className="inline-flex min-h-11 items-center gap-2 px-5 text-sm">
          <RotateCcw size={15} /> Try again
        </Button>
        <Link
          href="/home"
          className="btn-ghost inline-flex min-h-11 items-center gap-2 px-5 text-sm font-semibold"
        >
          <Home size={15} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
