"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password);
      // Onboarding: new readers land in settings to choose avatar + location.
      router.push("/me/settings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Join CurioMap</h1>
      <p className="mt-2 text-sm text-ink-muted">
        You&apos;ll get a generated handle and avatar — anonymous by default, fully
        customizable later.
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
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create my identity"}
        </Button>
        <p className="text-center text-sm text-ink-muted">
          Already exploring?{" "}
          <Link href="/auth/login" className="font-medium text-accent-strong hover:text-accent">
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
