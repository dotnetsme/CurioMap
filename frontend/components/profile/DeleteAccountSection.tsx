"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { deleteAccount } from "@/lib/api/auth";

/**
 * Self-service account deletion. Irreversible, so it sits behind a dialog that spells out what
 * happens and re-asks for the password (the server verifies it again).
 */
export function DeleteAccountSection() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setError(null);
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      await logout();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete your account");
      setBusy(false);
    }
  }

  return (
    <section className="glass flex flex-col gap-3 border border-heat-hot/30 p-6">
      <h2 className="font-display font-semibold text-ink-strong">Delete account</h2>
      <p className="text-sm text-ink-muted">
        Permanently remove your account and everything you wrote. This can&rsquo;t be undone.
      </p>
      <div>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 size={16} aria-hidden /> Delete my account…
        </Button>
      </div>

      <Modal open={open} onClose={close} title="Delete your account?">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password && !busy) void confirmDelete();
          }}
        >
          <p className="text-sm text-ink-muted">This permanently deletes:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>your profile, bookshelf, ratings, badges and streaks</li>
            <li>every message you posted, and the reports you filed</li>
            <li>your follows, and who follows you</li>
          </ul>
          <p className="mt-3 text-sm text-ink-muted">
            Threads you started that others replied to stay, shown as &ldquo;deleted_reader&rdquo;. Circles you
            created pass to their longest-standing member, or are deleted if nobody else is in them.
          </p>
          <div className="mt-4">
            <Label>Enter your password to confirm</Label>
            <Input
              type="password"
              autoComplete="current-password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              autoFocus
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" variant="danger" disabled={!password} isLoading={busy}>
              Delete permanently
            </Button>
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
