"use client";

import { MapPin } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfilePageView } from "@/components/profile/ProfilePageView";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Your own profile. The rendering itself lives in <ProfilePageView> (shared
 * with public /users/:id pages, which self-detect) — the shelf list and the
 * dashboard widgets belong to /me/bookshelf and /home, not here.
 */
export default function MyProfilePage() {
  const { user } = useAuth();

  return (
    <AuthGate
      icon={MapPin}
      title="Your profile"
      body="Sign in to see your reading identity, streak, and challenge progress."
    >
      {user ? <ProfilePageView userId={user.id} /> : null}
    </AuthGate>
  );
}
