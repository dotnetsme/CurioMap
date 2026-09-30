"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      setError(
        "Please accept the Terms of Use and Privacy Policy to continue.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(email, password, acceptTerms);
      const returnTo = searchParams.get("returnTo");
      const destination =
        returnTo?.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : "/me/settings";
      router.push(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        Join CurioMap
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        You&apos;ll get a generated handle and avatar — anonymous by default,
        fully customizable later.
      </p>
      <form onSubmit={submit} className="card mt-8 flex flex-col gap-4 p-6">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <Label>Password (min 8 characters)</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-ink-2">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-accent-strong"
            aria-label="I accept the Terms of Use and Privacy Policy"
          />
          <span>
            I accept the{" "}
            <Link
              href="/policy/terms"
              target="_blank"
              className="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
            >
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link
              href="/policy/privacy"
              target="_blank"
              className="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
            >
              Privacy Policy
            </Link>
            , and confirm I am at least 16 years old (or my country&apos;s
            minimum age).
          </span>
        </label>
        {error ? <p className="text-sm font-medium text-heat-hot">{error}</p> : null}
        <Button type="submit" isLoading={busy}>
          Create my identity
        </Button>
        <p className="text-center text-sm text-ink-muted">
          Already exploring?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
          >
            Sign in
          </Link>
        </p>
        <p className="text-center text-[11px] text-ink-3">
          We store your email only for sign-in. No tracking, no data selling.
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md py-10" />}>
      <RegisterForm />
    </Suspense>
  );
}
