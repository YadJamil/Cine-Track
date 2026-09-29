import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserList } from "@/features/social/components/user-list";
import { getProfileByUsername } from "@/features/profile/queries";
import { createClient, getUser } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} following` };
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getUser();
  const { header } = await getProfileByUsername(username, viewer?.id ?? null);
  if (!header) notFound();

  const supabase = await createClient();
  const { data: edges } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", header.id)
    .limit(200);

  return (
    <UserList
      title={`@${header.username} follows`}
      backHref={`/profile/${header.username}`}
      backLabel={header.displayName || header.username}
      userIds={(edges ?? []).map((e) => e.followee_id)}
      viewerId={viewer?.id ?? null}
    />
  );
}
