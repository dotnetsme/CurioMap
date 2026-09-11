import Link from "next/link";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/Badge";
import type { PublicProfile } from "@/types";

const modeLabels: Record<string, string> = {
  anonymous: "Anonymous",
  pseudonymous: "Pseudonymous",
  real_name: "Public identity",
};

export function ProfileHeader({
  profile,
  actions,
}: {
  profile: PublicProfile;
  actions?: React.ReactNode;
}) {
  const loc = profile.location;
  const locationLabel = loc
    ? [loc.city, loc.region, loc.country].filter(Boolean).join(", ")
    : "Location hidden";

  return (
    <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
      <Avatar avatarId={profile.avatarId} name={profile.displayName} size={72} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">{profile.displayName}</h1>
          <Badge tone="violet">{modeLabels[profile.displayNameMode] ?? profile.displayNameMode}</Badge>
          {profile.isAuthor ? <Badge tone="accent">Author</Badge> : null}
        </div>
        <p className="text-sm text-ink-3">@{profile.handle}</p>
        {profile.bio ? <p className="mt-2 max-w-xl text-sm text-ink-2">{profile.bio}</p> : null}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-3">
          <span>📍 {locationLabel}</span>
          <span>📚 {profile.bookshelfSummary.total} books</span>
          <span>{profile.followersCount} followers</span>
          <span>{profile.followingCount} following</span>
          <Link href={`/users/${profile.id}/bookshelf`} className="text-accent hover:text-accent-strong">
            View bookshelf →
          </Link>
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
