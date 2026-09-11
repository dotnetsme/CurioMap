"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "subtle";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-surface hover:bg-ink-2 active:scale-[0.98]",
  accent:
    "bg-accent text-white hover:bg-accent-strong active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]",
  ghost:
    "border border-line bg-transparent text-ink hover:border-ink-2 hover:bg-surface-2",
  subtle:
    "text-ink-2 hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
