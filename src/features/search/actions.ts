"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cinemeta, tvmaze } from "@/lib/tmdb/client";
import { err, ok, type Result } from "@/lib/types";

export type SearchResults = {
  shows: {
    tmdbId: number; // TVmaze show id
    name: string;
    posterPath: string | null;
    year: string | null;
  }[];
  movies: {
    tmdbId: string; // IMDb id (tt…)
    title: string;
    posterPath: string | null;
    year: string | null;
  }[];
  users: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
};

type SearchUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const querySchema = z.string().trim().min(1).max(100);

// The quick-search modal shows a teaser: 5 per media category (plus a few
// people) — the "See all results" row hands longer lists off to /search.
const DEFAULT_LIMIT = 5;

export async function searchAll(
  rawQuery: string,
  opts: { limit?: number; includeUsers?: boolean } = {},
): Promise<Result<SearchResults>> {
  const { limit = DEFAULT_LIMIT, includeUsers = true } = opts;
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) return ok({ shows: [], movies: [], users: [] });
  const query = parsed.data;

  const supabase = await createClient();
  const [showsRes, moviesRes, usersRes] = await Promise.allSettled([
    tvmaze.searchShows(query),
    cinemeta.searchMovies(query),
    includeUsers
      ? supabase.rpc("fn_search_users", { p_query: query, p_limit: limit })
      : Promise.resolve({ data: [] as SearchUserRow[] }),
  ]);

  if (
    showsRes.status === "rejected" &&
    moviesRes.status === "rejected" &&
    (usersRes.status === "rejected" || !includeUsers)
  ) {
    return err("Search is unavailable right now.");
  }

  return ok({
    shows:
      showsRes.status === "fulfilled"
        ? showsRes.value.slice(0, limit).map(({ show }) => ({
            tmdbId: show.id,
            name: show.name,
            posterPath: show.image?.medium ?? show.image?.original ?? null,
            year: show.premiered?.slice(0, 4) || null,
          }))
        : [],
    movies:
      moviesRes.status === "fulfilled"
        ? moviesRes.value.slice(0, limit).map((m) => ({
            tmdbId: m.imdb_id ?? m.id,
            title: m.name,
            posterPath: m.poster ?? null,
            year: m.releaseInfo?.slice(0, 4) || null,
          }))
        : [],
    users:
      usersRes.status === "fulfilled" && usersRes.value.data
        ? usersRes.value.data.map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
          }))
        : [],
  });
}

export type MediaSearchResults = Pick<SearchResults, "shows" | "movies">;

/** Picker-friendly wrapper over searchAll: no user results, configurable limit. */
export async function searchMedia(
  rawQuery: string,
  limit = 20,
): Promise<Result<MediaSearchResults>> {
  const res = await searchAll(rawQuery, { limit, includeUsers: false });
  return res.ok ? ok({ shows: res.data.shows, movies: res.data.movies }) : res;
}
