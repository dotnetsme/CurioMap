import { ProfilePageView } from "@/components/profile/ProfilePageView";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfilePageView userId={id} />;
}
