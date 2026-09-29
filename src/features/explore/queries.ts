import { unstable_cache } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Bucket } from "@/lib/supabase/database.types";
import { cinemeta } from "@/lib/tmdb/client";
import type { CinemetaMeta } from "@/lib/tmdb/types";
import type { MediaRowItem } from "@/components/shared/media-row";
import { posterUrl } from "@/lib/tmdb/images";
import { toCanonical, toCinemetaSpelling } from "./genre-map";
import {
  buildGenreAffinity,
  popularityRanks,
  scoreCandidate,
  topGenres,
  type WatchSignalInput,
} from "./scoring";

const genresSchema = z.array(z.object({ name: z.string() }));

function parseGenres(json: unknown): string[] {
  const parsed = genresSchema.safeParse(json);
  return parsed.success ? parsed.data.map((g) => toCanonical(g.name)) : [];
}

type ShowRow = {
  id: number;
  tmdb_id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string | null;
};

function showRowToItem(prefix: string) {
  return (s: ShowRow): MediaRowItem => ({
    key: `${prefix}-${s.tmdb_id}`,
    href: `/shows/${s.tmdb_id}`,
    title: s.name,
    posterUrl: posterUrl(s.poster_path),
    subtitle: s.first_air_date?.slice(0, 4) ?? null,
    mediaType: "show",
  });
}

function movieMetaToItem(m: CinemetaMeta): MediaRowItem {
  return {
    key: `movie-${m.imdb_id ?? m.id}`,
    href: `/movies/${m.imdb_id ?? m.id}`,
    title: m.name,
    posterUrl: posterUrl(m.poster ?? null),
    subtitle: m.releaseInfo?.slice(0, 4) ?? null,
    mediaType: "movie",
  };
}

/** Most popular locally-cached shows (external providers have no ranking API). */
export async function getPopularShows(
  limit = 12,
  userId?: string,
): Promise<MediaRowItem[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("shows")
    .select("id, tmdb_id, name, poster_path, first_air_date")
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(limit);
  const rows = data ?? [];
  const buckets = userId
    ? await getBucketsForShows(userId, rows.map((s) => s.id))
    : new Map<number, Bucket>();
  return rows.map((s) => ({
    ...showRowToItem("pop")(s),
    bucket: buckets.get(s.id) ?? null,
  }));
}

/** Popular movies from Cinemeta's top catalog. */
export async function getPopularMovies(limit = 12): Promise<MediaRowItem[]> {
  const metas = await cinemeta.popularMovies().catch(() => []);
  return metas.slice(0, limit).map(movieMetaToItem);
}

/** Trending inside CineTrack (mv_trending_shows); anonymous-safe, cached 15 min. */
export const getLocalTrending = unstable_cache(
  async (): Promise<
    (MediaRowItem & { backdropPath: string | null; voteAverage: number | null })[]
  > => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("mv_trending_shows")
      .select(
        "show_id, tmdb_id, name, poster_path, backdrop_path, first_air_date, vote_average, trend_score",
      )
      .order("trend_score", { ascending: false })
      .limit(12);
    return (data ?? []).map((s) => ({
      key: `local-${s.show_id}`,
      href: `/shows/${s.tmdb_id}`,
      title: s.name,
      posterUrl: posterUrl(s.poster_path),
      subtitle: s.first_air_date?.slice(0, 4) ?? null,
      mediaType: "show" as const,
      backdropPath: s.backdrop_path,
      voteAverage: s.vote_average,
    }));
  },
  ["local-trending"],
  { revalidate: 900, tags: ["trending"] },
);

/** Fixed cold-start genre list for signed-out visitors / too-little-history users. */
export function getDefaultGenres(): string[] {
  return ["Drama", "Comedy", "Action", "Science-Fiction", "Thriller", "Romance"];
}

export type GenreAffinity = {
  topGenres: string[];
  affinity: Map<string, number>;
  blockedShows: Set<number>;
  /** IMDb ids — live Cinemeta candidates are keyed by IMDb id, not our internal id. */
  blockedMovies: Set<string>;
};

/**
 * Builds the viewer's genre-affinity profile from their watch history,
 * ratings, and per-show engagement — see scoring.ts for the formula. Returns
 * null on cold start (no watch history, or too little signal to clear the
 * threshold for even one genre).
 */
export async function getUserGenreAffinity(
  userId: string,
): Promise<GenreAffinity | null> {
  const supabase = await createClient();

  const [
    { data: episodeWatches },
    { data: movieWatches },
    { data: reviews },
    { data: addiction },
    { data: followed },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("episode_watches")
      .select("show_id, watched_at")
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .limit(300),
    supabase
      .from("movie_watches")
      .select("movie_id, watched_at")
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .limit(300),
    supabase
      .from("reviews")
      .select("show_id, movie_id, rating")
      .eq("user_id", userId),
    supabase
      .from("show_addiction_scores")
      .select("show_id, weekly_score")
      .eq("user_id", userId),
    supabase
      .from("user_shows")
      .select("show_id")
      .eq("user_id", userId)
      .eq("is_followed", true),
    supabase
      .from("user_settings")
      .select("excluded_show_ids")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Most-recent watched_at per distinct title (input is already desc-ordered).
  const lastShowWatch = new Map<number, string>();
  for (const w of episodeWatches ?? []) {
    if (!lastShowWatch.has(w.show_id)) lastShowWatch.set(w.show_id, w.watched_at);
  }
  const lastMovieWatch = new Map<number, string>();
  for (const w of movieWatches ?? []) {
    if (!lastMovieWatch.has(w.movie_id)) lastMovieWatch.set(w.movie_id, w.watched_at);
  }

  const showRatings = new Map<number, number>();
  const movieRatings = new Map<number, number>();
  for (const r of reviews ?? []) {
    if (r.show_id != null) showRatings.set(r.show_id, r.rating);
    if (r.movie_id != null) movieRatings.set(r.movie_id, r.rating);
  }
  const addictionByShow = new Map(
    (addiction ?? []).map((a) => [a.show_id, a.weekly_score]),
  );

  const showIds = [...lastShowWatch.keys()];
  const movieIds = [...lastMovieWatch.keys()];

  const [{ data: shows }, { data: movies }] = await Promise.all([
    showIds.length
      ? supabase.from("shows").select("id, genres").in("id", showIds)
      : Promise.resolve({ data: [] as { id: number; genres: unknown }[] }),
    movieIds.length
      ? supabase.from("movies").select("id, genres, source_id").in("id", movieIds)
      : Promise.resolve({ data: [] as { id: number; genres: unknown; source_id: string }[] }),
  ]);

  const signals: WatchSignalInput[] = [];
  for (const s of shows ?? []) {
    const watchedAt = lastShowWatch.get(s.id);
    if (!watchedAt) continue;
    signals.push({
      genres: parseGenres(s.genres),
      lastWatchedAt: watchedAt,
      rating: showRatings.get(s.id) ?? null,
      addictionWeeklyScore: addictionByShow.get(s.id) ?? null,
    });
  }
  for (const m of movies ?? []) {
    const watchedAt = lastMovieWatch.get(m.id);
    if (!watchedAt) continue;
    signals.push({
      genres: parseGenres(m.genres),
      lastWatchedAt: watchedAt,
      rating: movieRatings.get(m.id) ?? null,
    });
  }

  const affinity = buildGenreAffinity(signals);
  const top = topGenres(affinity);
  if (top.length === 0) return null;

  return {
    topGenres: top,
    affinity,
    blockedShows: new Set<number>([
      ...showIds,
      ...(followed ?? []).map((f) => f.show_id),
      ...(settings?.excluded_show_ids ?? []),
    ]),
    // Live Cinemeta candidates are keyed by IMDb id, not our internal id.
    blockedMovies: new Set<string>((movies ?? []).map((m) => m.source_id)),
  };
}

type CandidateShow = {
  id: number;
  tmdb_id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string | null;
  genres: unknown;
  popularity: number | null;
  vote_average: number | null;
};

async function fetchShowCandidates(
  canonicalGenre: string | null,
  limit: number,
): Promise<CandidateShow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("shows")
    .select("id, tmdb_id, name, poster_path, first_air_date, genres, popularity, vote_average")
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (canonicalGenre) {
    // jsonb containment — must be a JSON string, else postgrest sends a PG array.
    query = query.contains("genres", JSON.stringify([{ name: canonicalGenre }]));
  }
  const { data } = await query;
  return data ?? [];
}

async function fetchMovieCandidates(
  canonicalGenre: string | null,
): Promise<CinemetaMeta[]> {
  if (!canonicalGenre) return cinemeta.popularMovies().catch(() => []);
  return cinemeta.moviesByGenre(toCinemetaSpelling(canonicalGenre)).catch(() => []);
}

/** trend_score for exactly the show ids being scored — cheap PK lookup. */
async function getTrendScores(showIds: number[]): Promise<Map<number, number>> {
  if (showIds.length === 0) return new Map();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("mv_trending_shows")
    .select("show_id, trend_score")
    .in("show_id", showIds);
  return new Map((data ?? []).map((r) => [r.show_id, r.trend_score]));
}

/**
 * Scores and merges show + movie candidates for one genre into a single
 * ranked list. Cinemeta's catalogs have no pagination param, so this always
 * fetches the full candidate pool and slices [offset, offset+limit) from the
 * fully-scored result — simpler and correct given that constraint, and cheap
 * to repeat since Next's fetch Data Cache means the Cinemeta call doesn't hit
 * the network again within its revalidate window.
 */
export async function getGenreBrowse(
  canonicalGenre: string,
  opts?: {
    limit?: number;
    offset?: number;
    blockedShows?: Set<number>;
    /** IMDb ids. */
    blockedMovies?: Set<string>;
    /** Score against a real multi-genre profile instead of this genre alone. */
    affinity?: Map<string, number>;
    /** When set, badges shows the viewer already tracks. */
    userId?: string;
  },
): Promise<MediaRowItem[]> {
  const limit = opts?.limit ?? 12;
  const offset = opts?.offset ?? 0;
  const blockedShows = opts?.blockedShows ?? new Set<number>();
  const blockedMovies = opts?.blockedMovies ?? new Set<string>();

  const [shows, movies] = await Promise.all([
    fetchShowCandidates(canonicalGenre, 60),
    fetchMovieCandidates(canonicalGenre),
  ]);

  const filteredShows = shows.filter((s) => !blockedShows.has(s.id));
  const filteredMovies = movies.filter((m) => !blockedMovies.has(m.imdb_id ?? m.id));

  const [trendScores, buckets] = await Promise.all([
    getTrendScores(filteredShows.map((s) => s.id)),
    opts?.userId
      ? getBucketsForShows(opts.userId, filteredShows.map((s) => s.id))
      : Promise.resolve(new Map<number, Bucket>()),
  ]);
  const maxTrend = Math.max(0, ...trendScores.values());

  const showRanks = popularityRanks(filteredShows, (s) => s.popularity);

  // Movies have no popularity field — Cinemeta's response order IS its own
  // ranking, so use position as the popularity proxy instead.
  const movieRankByIndex = new Map<CinemetaMeta, number>();
  filteredMovies.forEach((m, i) => {
    const n = filteredMovies.length;
    movieRankByIndex.set(m, n > 1 ? 1 - i / (n - 1) : 1);
  });

  const affinity = opts?.affinity ?? new Map([[canonicalGenre, 1]]);

  const scoredShows = filteredShows.map((s) => {
    const genres = parseGenres(s.genres);
    const score = scoreCandidate(
      {
        genres,
        popularityRank: showRanks.get(s) ?? 0,
        voteAverage: s.vote_average,
        trendScore: trendScores.get(s.id) ?? 0,
      },
      affinity,
      maxTrend,
    );
    return {
      score,
      item: { ...showRowToItem("genre")(s), bucket: buckets.get(s.id) ?? null },
    };
  });

  const scoredMovies = filteredMovies.map((m) => {
    const genres = (m.genre ?? m.genres ?? []).map(toCanonical);
    const voteAverage = m.imdbRating ? Number.parseFloat(m.imdbRating) : null;
    const score = scoreCandidate(
      {
        genres,
        popularityRank: movieRankByIndex.get(m) ?? 0,
        voteAverage: Number.isFinite(voteAverage) ? voteAverage : null,
        trendScore: 0,
      },
      affinity,
      maxTrend,
    );
    return { score, item: movieMetaToItem(m) };
  });

  return [...scoredShows, ...scoredMovies]
    .sort((a, b) => b.score - a.score)
    .slice(offset, offset + limit)
    .map((s) => s.item);
}

/** Mixed shows+movies ranked against the viewer's real multi-genre affinity. */
export async function getRecommendedForYou(
  affinity: GenreAffinity,
  limit = 12,
): Promise<MediaRowItem[]> {
  const perGenre = await Promise.all(
    affinity.topGenres.map((genre) =>
      getGenreBrowse(genre, {
        limit: 40,
        blockedShows: affinity.blockedShows,
        blockedMovies: affinity.blockedMovies,
        affinity: affinity.affinity,
      }),
    ),
  );
  const seen = new Set<string>();
  const merged: MediaRowItem[] = [];
  for (const items of perGenre) {
    for (const item of items) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      merged.push(item);
    }
  }
  return merged.slice(0, limit);
}

/**
 * Tracking status for a specific set of shows, regardless of follow state —
 * used to badge posters on non-personalized rows (Popular, genre browse)
 * where the viewer may or may not already track what's shown.
 */
export async function getBucketsForShows(
  userId: string,
  showIds: number[],
): Promise<Map<number, Bucket>> {
  if (showIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_user_show_progress")
    .select("show_id, bucket")
    .eq("user_id", userId)
    .in("show_id", showIds);
  return new Map((data ?? []).map((r) => [r.show_id, r.bucket]));
}
