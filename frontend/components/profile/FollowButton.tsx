"use client";

import { useState } from "react";
import * as followApi from "@/lib/api/follow";
import { Button } from "@/components/ui/Button";

export function FollowButton({
  userId,
  isFollowing,
  onChange,
}: {
  userId: string;
  isFollowing: boolean | null;
  onChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(isFollowing ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const next = !following;
      if (next) {
        await followApi.follow(userId);
      } else {
        await followApi.unfollow(userId);
      }
      setFollowing(next);
      onChange?.(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={following ? "ghost" : "primary"} onClick={toggle} disabled={busy}>
        {following ? "Following ✓" : "Follow"}
      </Button>
      {error ? <span className="text-xs text-heat-hot">{error}</span> : null}
    </span>
  );
}
