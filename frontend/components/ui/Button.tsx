"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "subtle";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong",
  accent: "bg-accent text-accent-ink hover:bg-accent-strong",
  danger: "bg-heat-hot text-white hover:bg-heat-hot-2",
  ghost: "bg-fill text-accent hover:bg-fill-2",
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium tracking-[-0.01em] transition duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-current" />
      ) : null}
      {children}
    </button>
  );
}
