import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "./follow-button";

export async function UserList({
  title,
  backHref,
  backLabel,
  userIds,
  viewerId,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  userIds: string[];
  viewerId: string | null;
}) {
  const supabase = await createClient();
  const [{ data: profiles }, { data: viewerFollows }] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
    viewerId
      ? supabase
          .from("follows")
          .select("followee_id")
          .eq("follower_id", viewerId)
      : Promise.resolve({ data: [] }),
  ]);

  const followingIds = new Set(
    (viewerFollows ?? []).map((f) => f.followee_id),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {backLabel}
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
      {!profiles || profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nobody here yet"
          description="Follow people to grow the graph."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Link href={`/profile/${p.username}`}>
                <UserAvatar
                  username={p.username}
                  displayName={p.display_name}
                  avatarUrl={p.avatar_url}
                  className="size-10"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${p.username}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {p.display_name || p.username}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  @{p.username}
                </p>
              </div>
              {viewerId !== p.id ? (
                <FollowButton
                  followeeId={p.id}
                  username={p.username}
                  initialFollowing={followingIds.has(p.id)}
                  signedIn={!!viewerId}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
