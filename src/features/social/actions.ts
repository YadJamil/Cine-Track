"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { err, ok, type Result } from "@/lib/types";

const followSchema = z.object({
  followeeId: z.string().uuid(),
  username: z.string().min(1),
  follow: z.boolean(),
});

export async function setFollowUser(input: unknown): Promise<Result> {
  const parsed = followSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to follow people.");
  if (user.id === parsed.data.followeeId) return err("You can't follow yourself.");

  if (parsed.data.follow) {
    const { error } = await supabase.from("follows").upsert(
      { follower_id: user.id, followee_id: parsed.data.followeeId },
      { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
    );
    if (error) return err(error.message);
    const { error: badgeError } = await supabase.rpc("fn_check_badges", {
      p_user_id: user.id,
    });
    if (badgeError) console.error(badgeError);
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", parsed.data.followeeId);
    if (error) return err(error.message);
  }

  revalidatePath(`/profile/${parsed.data.username}`);
  revalidatePath("/notifications");
  return ok(undefined);
}
