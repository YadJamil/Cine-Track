"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitError } from "@/lib/rate-limit";
import { err, ok, type Result } from "@/lib/types";

const addCommentSchema = z
  .object({
    mediaType: z.enum(["show", "movie"]),
    showId: z.number().int().positive().optional(),
    episodeId: z.number().int().positive().optional(),
    movieId: z.number().int().positive().optional(),
    body: z.string().trim().min(1).max(2000),
    containsSpoiler: z.boolean(),
    revalidate: z.string().startsWith("/"),
  })
  .refine(
    (v) =>
      (v.mediaType === "show" && v.showId && !v.movieId) ||
      (v.mediaType === "movie" && v.movieId && !v.showId && !v.episodeId),
    "Invalid comment target",
  );

export async function addComment(input: unknown): Promise<Result> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) return err("Invalid comment");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to comment.");

  const limited = await rateLimitError(supabase, "comments", user.id);
  if (limited) return err(limited);

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    media_type: parsed.data.mediaType,
    show_id: parsed.data.showId ?? null,
    episode_id: parsed.data.episodeId ?? null,
    movie_id: parsed.data.movieId ?? null,
    body: parsed.data.body,
    contains_spoiler: parsed.data.containsSpoiler,
  });
  if (error) return err(error.message);

  revalidatePath(parsed.data.revalidate);
  return ok(undefined);
}

const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
  revalidate: z.string().startsWith("/"),
});

export async function deleteComment(input: unknown): Promise<Result> {
  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", parsed.data.commentId)
    .eq("user_id", user.id);
  if (error) return err(error.message);

  revalidatePath(parsed.data.revalidate);
  return ok(undefined);
}

const likeSchema = z.object({
  commentId: z.string().uuid(),
  liked: z.boolean(),
});

export async function setCommentLike(input: unknown): Promise<Result> {
  const parsed = likeSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to like comments.");

  if (parsed.data.liked) {
    const { error } = await supabase
      .from("comment_likes")
      .upsert(
        { comment_id: parsed.data.commentId, user_id: user.id },
        { onConflict: "comment_id,user_id", ignoreDuplicates: true },
      );
    if (error) return err(error.message);
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", parsed.data.commentId)
      .eq("user_id", user.id);
    if (error) return err(error.message);
  }
  return ok(undefined);
}
