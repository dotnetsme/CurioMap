"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Users, MessageCircle, Calendar, Flame } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/profile/Avatar";
import { timeAgo } from "@/lib/time";
import type { Circle } from "@/types";

export function CircleCard({ circle }: { circle: Circle }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <Link href={`/circles/${circle.handle}`} className="card card-hover flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-ink hover:text-accent">
              {circle.name}
            </h3>
            <p className="text-sm text-ink-faint">/{circle.handle}</p>
          </div>
          {circle.book ? (
            <Badge tone="accent">{circle.book.title}</Badge>
          ) : null}
        </div>

        {circle.description ? (
          <p className="line-clamp-2 text-sm text-ink-muted">{circle.description}</p>
        ) : null}

        <div className="mt-auto flex items-center gap-3 text-xs text-ink-faint">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {circle.memberCount}
            {circle.maxMembers ? ` / ${circle.maxMembers}` : ""}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={14} />
            {circle.messageCount}
          </span>
          {circle.currentStreak > 0 ? (
            <span
              className="flex items-center gap-1 text-amber-500"
              title={`Group streak — longest ${circle.longestStreak} days`}
            >
              <Flame size={14} aria-hidden />
              {circle.currentStreak}-day
            </span>
          ) : null}
          {circle.nextMeetingAt ? (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {new Date(circle.nextMeetingAt).toLocaleDateString()}
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-1">
            <Avatar avatarId={circle.createdBy.avatarId} name={circle.createdBy.displayName} size={18} />
            {circle.createdBy.displayName}
          </span>
        </div>

        <div className="text-xs text-ink-faint">
          Active {timeAgo(circle.lastActivityAt)}
        </div>
      </Link>
    </motion.div>
  );
}
