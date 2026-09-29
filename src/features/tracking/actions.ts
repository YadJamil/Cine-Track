"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setMovieWatched } from "@/features/movies/actions";
import { createClient, getUser } from "@/lib/supabase/server";
import { getOrCacheMovie, getOrCacheShow } from "@/lib/tmdb/cache";
import { err, ok, type Result } from "@/lib/types";

const markSchema = z.object({
  showId: z.number().int().positive(),
  showTmdbId: z.number().int().positive(),
  mode: z.enum(["unitary", "season", "show", "fill_previous"]),
  episodeId: z.number().int().positive().optional(),
  seasonNumber: z.number().int().min(0).optional(),
});

function revalidateTracking(showTmdbId: number, episodeId?: number) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/shows/${showTmdbId}`);
  if (episodeId) revalidatePath(`/episodes/${episodeId}`);
}

export async function markWatched(
  input: unknown,
): Promise<Result<{ inserted: number }>> {
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to track episodes.");

  const { data, error } = await supabase.rpc("mark_watched", {
    p_show_id: parsed.data.showId,
    p_mode: parsed.data.mode,
    p_episode_id: parsed.data.episodeId,
    p_season_number: parsed.data.seasonNumber,
  });
  if (error) return err(`Could not mark watched: ${error.message}`);

  revalidateTracking(parsed.data.showTmdbId, parsed.data.episodeId);
  return ok({ inserted: data?.length ?? 0 });
}

const markMultipleSchema = z.object({
  shows: z
    .array(z.object({ tmdbId: z.number().int().positive(), title: z.string().min(1).max(300) }))
    .max(50),
  movies: z
    .array(z.object({ tmdbId: z.string().regex(/^tt\d+$/), title: z.string().min(1).max(300) }))
    .max(50),
  username: z.string().min(1).max(50),
});

export type BulkMarkSummary = {
  marked: number;
  failed: { title: string; type: "show" | "movie"; reason: string }[];
};

/**
 * Bulk-logs a backlog of shows/movies as watched — resolves each search
 * result to its internal row, then delegates to the same actions a single
 * show/movie page would call (markWatched mode:"show", setMovieWatched), so
 * the actual watch-marking logic lives in exactly one place each. Best-effort:
 * one bad lookup doesn't sink the rest of the batch.
 */
export async function markMultipleWatched(
  input: unknown,
): Promise<Result<BulkMarkSummary>> {
  const parsed = markMultipleSchema.safeParse(input);
  if (!parsed.success) return err("Invalid selection");
  if (parsed.data.shows.length + parsed.data.movies.length === 0) {
    return err("Nothing selected");
  }

  const user = await getUser();
  if (!user) return err("Log in to log watched titles.");

  const outcomes = await Promise.allSettled([
    ...parsed.data.shows.map(async (s) => {
      const show = await getOrCacheShow(s.tmdbId);
      const res = await markWatched({
        showId: show.id,
        showTmdbId: show.tmdb_id,
        mode: "show",
      });
      if (!res.ok) throw new Error(res.error);
      return s.title;
    }),
    ...parsed.data.movies.map(async (m) => {
      const movie = await getOrCacheMovie(m.tmdbId);
      const res = await setMovieWatched({
        movieId: movie.id,
        movieTmdbId: movie.source_id,
        watched: true,
      });
      if (!res.ok) throw new Error(res.error);
      return m.title;
    }),
  ]);

  const allInputs = [
    ...parsed.data.shows.map((s) => ({ ...s, type: "show" as const })),
    ...parsed.data.movies.map((m) => ({ ...m, type: "movie" as const })),
  ];
  const summary: BulkMarkSummary = { marked: 0, failed: [] };
  outcomes.forEach((o, i) => {
    if (o.status === "fulfilled") {
      summary.marked++;
      return;
    }
    const item = allInputs[i];
    if (!item) return; // unreachable: outcomes and allInputs are built pairwise
    summary.failed.push({
      title: item.title,
      type: item.type,
      reason: o.reason instanceof Error ? o.reason.message : "error",
    });
  });

  revalidatePath(`/profile/${parsed.data.username}`);
  return ok(summary);
}

const unmarkSchema = z.object({
  episodeId: z.number().int().positive(),
  showTmdbId: z.number().int().positive(),
});

export async function unmarkWatched(input: unknown): Promise<Result> {
  const parsed = unmarkSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase.rpc("unmark_watched", {
    p_episode_id: parsed.data.episodeId,
  });
  if (error) return err(error.message);

  revalidateTracking(parsed.data.showTmdbId, parsed.data.episodeId);
  return ok(undefined);
}

const unmarkSeasonSchema = z.object({
  showId: z.number().int().positive(),
  showTmdbId: z.number().int().positive(),
  seasonNumber: z.number().int().min(0),
});

export async function unmarkSeason(input: unknown): Promise<Result> {
  const parsed = unmarkSeasonSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase.rpc("unmark_season", {
    p_show_id: parsed.data.showId,
    p_season_number: parsed.data.seasonNumber,
  });
  if (error) return err(error.message);

  revalidateTracking(parsed.data.showTmdbId);
  return ok(undefined);
}

const watchlistSchema = z.object({
  showId: z.number().int().positive(),
  showTmdbId: z.number().int().positive(),
  value: z.boolean(),
});

/**
 * Add to / remove from the watchlist — the primary action on a show.
 *
 * Adding puts the show in your library and flags it, so it lands in the
 * watchlist whether or not you've watched anything (`mark_watched` clears the
 * flag again once you start it). Removing un-flags it, and only unfollows when
 * nothing has been watched: an unstarted show has nothing else keeping it in
 * your library, while a started one just returns to its progress bucket.
 */
export async function setWatchlist(input: unknown): Promise<Result> {
  const parsed = watchlistSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");
  const { showId, showTmdbId, value } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to track shows.");

  let keepFollowing = true;
  if (!value) {
    const { count } = await supabase
      .from("episode_watches")
      .select("episode_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("show_id", showId);
    keepFollowing = (count ?? 0) > 0;
  }

  const { error } = await supabase.from("user_shows").upsert(
    {
      user_id: user.id,
      show_id: showId,
      is_for_later: value,
      is_followed: value || keepFollowing,
      ...(value
        ? { is_archived: false, followed_at: new Date().toISOString() }
        : {}),
    } as never,
    { onConflict: "user_id,show_id" },
  );
  if (error) return err(error.message);

  revalidateTracking(showTmdbId);
  return ok(undefined);
}

const flagSchema = z.object({
  showId: z.number().int().positive(),
  showTmdbId: z.number().int().positive(),
  flag: z.enum(["is_followed", "is_favorited", "is_for_later", "is_archived"]),
  value: z.boolean(),
});

/**
 * Follow / favorite / for-later / archive. Unfollow keeps the row and all
 * watches (export behavior: is_followed=0 rows persist).
 */
export async function setShowFlag(input: unknown): Promise<Result> {
  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");
  const { showId, showTmdbId, flag, value } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to track shows.");

  const patch: Record<string, unknown> = {
    user_id: user.id,
    show_id: showId,
    [flag]: value,
  };
  if (flag === "is_followed" && value) patch.followed_at = new Date().toISOString();
  // Following again un-archives; for-later and archived are mutually exclusive
  if (flag === "is_for_later" && value) patch.is_archived = false;
  if (flag === "is_archived" && value) patch.is_for_later = false;

  const { error } = await supabase
    .from("user_shows")
    .upsert(patch as never, { onConflict: "user_id,show_id" });
  if (error) return err(error.message);

  if (flag === "is_followed" && value) {
    const { error: badgeError } = await supabase.rpc("fn_check_badges", {
      p_user_id: user.id,
    });
    if (badgeError) {
      // non-fatal: badges recompute on the next watch
      console.error(badgeError);
    }
  }

  revalidateTracking(showTmdbId);
  return ok(undefined);
}
