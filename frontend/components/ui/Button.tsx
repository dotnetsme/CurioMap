"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "subtle";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-lg shadow-accent/25 hover:bg-accent-strong active:scale-[0.98]",
  accent:
    "bg-accent text-accent-ink shadow-lg shadow-accent/25 hover:bg-accent-strong active:scale-[0.98]",
  danger: "bg-heat-hot text-white hover:bg-heat-hot-2 active:scale-[0.98]",
  ghost:
    "border border-line bg-transparent text-ink hover:border-accent hover:bg-white/5",
  subtle: "text-ink-muted hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-current" />
      ) : null}
      {children}
    </button>
  );
}
