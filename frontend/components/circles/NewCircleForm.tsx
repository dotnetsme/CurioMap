"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCircle } from "@/lib/api/circles";
import type { Circle, CreateCirclePayload } from "@/types";

export function NewCircleForm({ onCreated }: { onCreated: (c: Circle) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: CreateCirclePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        maxMembers: maxMembers ? parseInt(maxMembers, 10) : undefined,
      };
      const circle = await createCircle(payload);
      setName("");
      setDescription("");
      setMaxMembers("");
      setOpen(false);
      onCreated(circle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create circle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AnimatePresence>
        {!open ? (
          <motion.button
            key="btn"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Start a Circle
          </motion.button>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={submit}
            className="card flex flex-col gap-3 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">Start a new circle</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-ink-3 hover:bg-surface hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Circle name (3–80 chars)"
              required
              minLength={3}
              maxLength={80}
            />

            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this circle about? (optional)"
              maxLength={500}
            />

            <Input
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              placeholder="Max members (optional)"
              type="number"
              min={2}
              max={100}
            />

            {error ? <p className="text-sm text-heat-hot">{error}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {busy ? "Creating…" : "Create Circle"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
