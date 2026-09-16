"use client";

import { use, useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  MessageCircle,
  BookOpen,
  Calendar,
  LogIn,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/Feedback";
import { getCircle, joinCircle, leaveCircle } from "@/lib/api/circles";
import { CircleStreakChip } from "./CircleStreakChip";
import { CircleMessageList } from "./CircleMessageList";
import { useAuth } from "@/components/providers/AuthProvider";
import type { CircleDetail as CircleDetailType, CircleMember } from "@/types";

export function CircleDetail({ handle }: { handle: Promise<string> | string }) {
  const { user } = useAuth();
  const resolvedHandle = typeof handle === "string" ? handle : use(handle);
  const [circle, setCircle] = useState<CircleDetailType | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await getCircle(resolvedHandle);
      setCircle(c);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [resolvedHandle]);

  useEffect(() => {
    load();
  }, [load]);

  const membership: CircleMember | undefined = circle?.members.find(
    (m) => m.userId === user?.id,
  );
  const canPost = !!membership;

  async function toggleMembership() {
    if (!circle) return;
    setJoining(true);
    try {
      if (membership) {
        await leaveCircle(circle.handle);
        const leftId = user?.id;
        setCircle((prev) =>
          prev
            ? {
                ...prev,
                memberCount: Math.max(0, prev.memberCount - 1),
                members: prev.members.filter((m) => m.userId !== leftId),
              }
            : prev);
      } else {
        await joinCircle(circle.handle);
        load();
      }
    } catch {
      // silent fail
    } finally {
      setJoining(false);
    }
  }

  if (status === "loading") return <Skeleton className="h-64 w-full" />;
  if (status === "error" || !circle) return <EmptyState title="Circle not found" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">{circle.name}</h1>
            <p className="text-sm text-ink-3">/{circle.handle}</p>
          </div>
          <div className="flex items-center gap-2">
            {membership?.role === "moderator" ? (
              <Badge tone="accent">Mod</Badge>
            ) : null}
            <Button
              onClick={toggleMembership}
              disabled={joining}
              variant={membership ? "ghost" : "primary"}
            >
              {joining ? (
                <Loader2 size={16} className="animate-spin" />
              ) : membership ? (
                <>
                  <LogOut size={16} /> Leave
                </>
              ) : (
                <>
                  <LogIn size={16} /> Join
                </>
              )}
            </Button>
          </div>
        </div>

        {circle.description ? <p className="text-ink-2">{circle.description}</p> : null}

        <div className="flex flex-wrap gap-4 text-sm text-ink-3">
          <span className="flex items-center gap-1">
            <Users size={16} />
            {circle.memberCount}
            {circle.maxMembers ? ` / ${circle.maxMembers}` : ""} members
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={16} />
            {circle.messageCount} messages
          </span>
          <CircleStreakChip handle={circle.handle} />
          {circle.book ? (
            <span className="flex items-center gap-1">
              <BookOpen size={16} />
              {circle.book.title}
            </span>
          ) : null}
          {circle.nextMeetingAt ? (
            <span className="flex items-center gap-1">
              <Calendar size={16} />
              Next meeting: {new Date(circle.nextMeetingAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        {circle.members.length > 0 ? (
          <div className="flex items-center gap-2">
            <AvatarStack
              avatars={circle.members.slice(0, 8).map((m) => ({ avatarId: m.avatarId, name: m.displayName }))}
              size={28}
            />
            <span className="text-xs text-ink-3">
              {circle.members.length > 8 ? `+${circle.members.length - 8} more` : ""}
            </span>
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-semibold text-ink">Discussion</h2>
        <CircleMessageList handle={circle.handle} canPost={canPost} />
      </div>
    </motion.div>
  );
}
