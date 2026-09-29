"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitError } from "@/lib/rate-limit";
import { err, ok, type Result } from "@/lib/types";

const upsertReviewSchema = z
  .object({
    mediaType: z.enum(["show", "movie"]),
    showId: z.number().int().positive().optional(),
    movieId: z.number().int().positive().optional(),
    rating: z.number().int().min(1).max(10),
    body: z.string().trim().max(5000).optional(),
    revalidate: z.string().startsWith("/"),
  })
  .refine(
    (v) =>
      (v.mediaType === "show" && v.showId && !v.movieId) ||
      (v.mediaType === "movie" && v.movieId && !v.showId),
    "Invalid review target",
  );

export async function upsertReview(input: unknown): Promise<Result> {
  const parsed = upsertReviewSchema.safeParse(input);
  if (!parsed.success) return err("Invalid review");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to review.");

  const limited = await rateLimitError(supabase, "reviews", user.id, 60, 3);
  if (limited) return err(limited);

  // one review per user per title (partial unique indexes)
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq(
      parsed.data.mediaType === "show" ? "show_id" : "movie_id",
      (parsed.data.mediaType === "show"
        ? parsed.data.showId
        : parsed.data.movieId) as number,
    )
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("reviews")
        .update({ rating: parsed.data.rating, body: parsed.data.body || null })
        .eq("id", existing.id)
    : await supabase.from("reviews").insert({
        user_id: user.id,
        media_type: parsed.data.mediaType,
        show_id: parsed.data.showId ?? null,
        movie_id: parsed.data.movieId ?? null,
        rating: parsed.data.rating,
        body: parsed.data.body || null,
      });
  if (error) return err(error.message);

  const { error: badgeError } = await supabase.rpc("fn_check_badges", {
    p_user_id: user.id,
  });
  if (badgeError) console.error(badgeError);

  revalidatePath(parsed.data.revalidate);
  return ok(undefined);
}

const deleteReviewSchema = z.object({
  reviewId: z.string().uuid(),
  revalidate: z.string().startsWith("/"),
});

export async function deleteReview(input: unknown): Promise<Result> {
  const parsed = deleteReviewSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", parsed.data.reviewId)
    .eq("user_id", user.id);
  if (error) return err(error.message);

  revalidatePath(parsed.data.revalidate);
  return ok(undefined);
}
