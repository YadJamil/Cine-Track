"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import { setFollowUser } from "../actions";

export function FollowButton({
  followeeId,
  username,
  initialFollowing,
  signedIn,
  size = "sm",
}: {
  followeeId: string;
  username: string;
  initialFollowing: boolean;
  signedIn: boolean;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const following = useOptimisticToggle(initialFollowing, async (next) => {
    const res = await setFollowUser({ followeeId, username, follow: next });
    if (res.ok) router.refresh();
    return res;
  });

  return (
    <Button
      size={size}
      variant={following.value ? "secondary" : "default"}
      aria-pressed={following.value}
      onClick={() => {
        if (!signedIn) {
          toast.error("Log in to follow people.");
          return;
        }
        following.toggle();
      }}
    >
      {following.value ? (
        <>
          <Check data-icon="inline-start" aria-hidden /> Following
        </>
      ) : (
        <>
          <UserPlus data-icon="inline-start" aria-hidden /> Follow
        </>
      )}
    </Button>
  );
}
