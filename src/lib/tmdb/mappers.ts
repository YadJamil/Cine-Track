import type { Database } from "@/lib/supabase/database.types";
import { pickLandscapeImage } from "./images";
import type {
  CinemetaMeta,
  TvmazeEpisode,
  TvmazeSeason,
  TvmazeShowWithEmbed,
} from "./types";

type ShowInsert = Database["public"]["Tables"]["shows"]["Insert"];
type SeasonInsert = Database["public"]["Tables"]["seasons"]["Insert"];
type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];
type MovieInsert = Database["public"]["Tables"]["movies"]["Insert"];

/** TVmaze/Cinemeta summaries are HTML fragments; store plain text. */
export function stripHtml(s: string | null | undefined): string | null {
  if (!s) return null;
  const text = s
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

function genreObjects(genres: string[] | null | undefined) {
  return (genres ?? []).map((name) => ({ name }));
}

function runtimeMinutes(runtime: string | null | undefined): number | null {
  if (!runtime) return null;
  const m = runtime.match(/(\d+)/);
  return m?.[1] ? parseInt(m[1], 10) : null;
}

export function mapShowDetails(d: TvmazeShowWithEmbed): ShowInsert {
  const seasons = d._embedded?.seasons ?? [];
  const episodes = d._embedded?.episodes ?? [];
  const images = d._embedded?.images ?? [];
  const net = d.network ?? d.webChannel ?? null;
  return {
    tmdb_id: d.id, // now the TVmaze show id (see column comment in migration)
    name: d.name,
    original_name: null,
    overview: stripHtml(d.summary),
    poster_path: d.image?.medium ?? d.image?.original ?? null,
    backdrop_path: pickLandscapeImage(images),
    first_air_date: d.premiered || null,
    status: d.status ?? null,
    in_production: d.status ? d.status === "Running" : null,
    episode_runtime: d.averageRuntime ?? d.runtime ?? null,
    genres: genreObjects(d.genres),
    networks: net ? [{ id: net.id, name: net.name }] : [],
    origin_country: [],
    original_language: null,
    number_of_seasons:
      seasons.filter((s) => s.number > 0).length || seasons.length || null,
    number_of_episodes: episodes.length || null,
    popularity: d.weight ?? null,
    vote_average: d.rating?.average ?? null,
    synced_at: new Date().toISOString(),
  };
}

export function mapSeasonSummary(
  s: TvmazeSeason,
  showId: number,
): SeasonInsert {
  return {
    show_id: showId,
    tmdb_id: s.id,
    season_number: s.number,
    name: s.name || null,
    overview: stripHtml(s.summary),
    poster_path: s.image?.medium ?? s.image?.original ?? null,
    air_date: s.premiereDate || null,
    episode_count: s.episodeOrder ?? null,
  };
}

export function mapEpisode(
  e: TvmazeEpisode,
  showId: number,
  seasonId: number | null,
): EpisodeInsert {
  return {
    show_id: showId,
    season_id: seasonId,
    tmdb_id: e.id,
    season_number: e.season,
    episode_number: e.number ?? 0,
    name: e.name || null,
    overview: stripHtml(e.summary),
    still_path: e.image?.medium ?? e.image?.original ?? null,
    air_date: e.airdate || null,
    runtime: e.runtime ?? null,
  };
}

export function mapMovieDetails(d: CinemetaMeta): MovieInsert {
  const releaseDate = d.released
    ? d.released.slice(0, 10)
    : d.year
      ? `${d.year.slice(0, 4)}-01-01`
      : null;
  const rating = d.imdbRating ? Number(d.imdbRating) : null;
  return {
    source_id: d.imdb_id ?? d.id, // IMDb id (tt…)
    title: d.name,
    original_title: null,
    overview: d.description ?? null,
    poster_path: d.poster ?? null,
    // Cinemeta defaults to the "medium" background (1920x1080, ~750KB); the
    // "small" variant (480x270, ~28KB) at the same host is plenty for a
    // decorative cover and avoids downloading a near-1MB image per movie.
    backdrop_path: d.background?.replace("/background/medium/", "/background/small/") ?? null,
    release_date: releaseDate,
    runtime: runtimeMinutes(d.runtime),
    genres: genreObjects(d.genre ?? d.genres),
    popularity: null,
    vote_average: rating != null && !Number.isNaN(rating) ? rating : null,
    synced_at: new Date().toISOString(),
  };
}
