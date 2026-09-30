"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      const returnTo = searchParams.get("returnTo");
      const destination =
        returnTo?.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : "/home";
      router.push(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Sign in to your anonymous reading identity.
      </p>
      <form onSubmit={submit} className="card mt-8 flex flex-col gap-5 p-6">
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
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-sm font-medium text-heat-hot">{error}</p> : null}
        <Button type="submit" isLoading={busy}>
          Sign in
        </Button>
        <p className="text-center text-sm text-ink-muted">
          New here?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
          >
            Create an anonymous identity
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md py-10" />}>
      <LoginForm />
    </Suspense>
  );
}
