"use client";

import { Compass } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export default function HomeDashboardPage() {
  return (
    <AuthGate
      icon={Compass}
      title="Your reading home"
      body="Sign in to see your shelf, readers in your city, and what the world is reading right now — anonymous by default, never your exact location."
    >
      <HomeDashboard />
    </AuthGate>
  );
}
