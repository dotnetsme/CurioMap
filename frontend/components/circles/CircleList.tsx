"use client";

import { motion } from "motion/react";
import { CircleCard } from "./CircleCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/Feedback";
import type { Circle } from "@/types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function CircleList({ circles, status }: { circles: Circle[]; status: "loading" | "idle" | "error" }) {
  if (status === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <EmptyState title="Could not load circles" />;
  }

  if (circles.length === 0) {
    return (
      <EmptyState
        title="No circles yet"
        hint="Be the first to start a reading circle!"
      />
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {circles.map((circle) => (
        <motion.div key={circle.id} variants={item}>
          <CircleCard circle={circle} />
        </motion.div>
      ))}
    </motion.div>
  );
}
