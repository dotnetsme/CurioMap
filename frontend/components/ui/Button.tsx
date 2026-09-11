"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "subtle";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:opacity-90 shadow-lg shadow-violet-500/20",
  ghost: "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10",
  danger: "bg-rose-500/90 text-white hover:bg-rose-500",
  subtle: "text-slate-300 hover:text-white",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
