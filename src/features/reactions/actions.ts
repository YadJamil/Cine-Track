"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { err, ok, type Result } from "@/lib/types";

const reactionSchema = z.object({
  episodeId: z.number().int().positive(),
  // null clears the reaction
  reaction: z.enum(["good", "fun", "wow", "sad", "soso", "bad"]).nullable(),
  revalidate: z.string().startsWith("/"),
});

export async function setEpisodeReaction(input: unknown): Promise<Result> {
  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) return err("Invalid reaction");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to react.");

  if (parsed.data.reaction === null) {
    const { error } = await supabase
      .from("episode_reactions")
      .delete()
      .eq("episode_id", parsed.data.episodeId)
      .eq("user_id", user.id);
    if (error) return err(error.message);
  } else {
    const { error } = await supabase.from("episode_reactions").upsert(
      {
        user_id: user.id,
        episode_id: parsed.data.episodeId,
        reaction: parsed.data.reaction,
      },
      { onConflict: "user_id,episode_id" },
    );
    if (error) return err(error.message);
  }

  revalidatePath(parsed.data.revalidate);
  return ok(undefined);
}
