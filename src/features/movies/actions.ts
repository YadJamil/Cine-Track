"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { err, ok, type Result } from "@/lib/types";

const watchSchema = z.object({
  movieId: z.number().int().positive(),
  movieTmdbId: z.string().regex(/^tt\d+$/), // IMDb id, used for revalidatePath
  watched: z.boolean(),
});

/** Movies are first-class trackables; runtime snapshotted like episodes. */
export async function setMovieWatched(input: unknown): Promise<Result> {
  const parsed = watchSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to track movies.");

  if (parsed.data.watched) {
    const { data: movie } = await supabase
      .from("movies")
      .select("runtime")
      .eq("id", parsed.data.movieId)
      .maybeSingle();
    if (!movie) return err("Movie not found");

    const { error } = await supabase.from("movie_watches").upsert(
      {
        user_id: user.id,
        movie_id: parsed.data.movieId,
        runtime_seconds: (movie.runtime ?? 0) * 60,
      },
      { onConflict: "user_id,movie_id", ignoreDuplicates: true },
    );
    if (error) return err(error.message);

    const { error: badgeError } = await supabase.rpc("fn_check_badges", {
      p_user_id: user.id,
    });
    if (badgeError) console.error(badgeError);
  } else {
    const { error } = await supabase
      .from("movie_watches")
      .delete()
      .eq("user_id", user.id)
      .eq("movie_id", parsed.data.movieId);
    if (error) return err(error.message);
  }

  revalidatePath(`/movies/${parsed.data.movieTmdbId}`);
  return ok(undefined);
}
