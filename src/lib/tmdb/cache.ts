import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/database.types";
import { cinemeta, tvmaze } from "./client";
import { pickLandscapeImage } from "./images";
import {
  mapEpisode,
  mapMovieDetails,
  mapSeasonSummary,
  mapShowDetails,
} from "./mappers";

// Refresh cadence: stale after 7 days; 24h for continuing shows.
const STALE_MS = 7 * 24 * 3600_000;
const STALE_CONTINUING_MS = 24 * 3600_000;

function isStale(row: { synced_at: string; in_production?: boolean | null }) {
  const age = Date.now() - new Date(row.synced_at).getTime();
  return age > (row.in_production ? STALE_CONTINUING_MS : STALE_MS);
}

/**
 * Read-through cache keyed by the TVmaze show id (stored in `shows.tmdb_id`).
 * One embedded TVmaze request returns the show plus every season and episode.
 * All app features join the returned LOCAL ids, never raw provider payloads.
 */
export async function getOrCacheShow(tvmazeId: number): Promise<Tables<"shows">> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("shows")
    .select("*")
    .eq("tmdb_id", tvmazeId)
    .maybeSingle();
  if (existing && !isStale(existing)) {
    if (!existing.backdrop_path) {
      try {
        const landscape = pickLandscapeImage(await tvmaze.showImages(tvmazeId));
        if (landscape) {
          const { data: updated } = await supabase
            .from("shows")
            .update({ backdrop_path: landscape })
            .eq("id", existing.id)
            .select()
            .single();
          if (updated) return updated;
        }
      } catch {
        // Ignore fallback errors and return the existing show
      }
    }
    return existing;
  }

  const details = await tvmaze.showDetails(tvmazeId);
  const seasons = details._embedded?.seasons ?? [];
  // Specials without an episode number would collide on the unique key — drop them.
  const episodes = (details._embedded?.episodes ?? []).filter(
    (e) => e.number != null,
  );

  const { data: show, error: showError } = await supabase
    .from("shows")
    .upsert(mapShowDetails(details), { onConflict: "tmdb_id" })
    .select()
    .single();
  if (showError || !show) {
    throw new Error(`Failed to cache show ${tvmazeId}: ${showError?.message}`);
  }

  if (seasons.length > 0) {
    const { data: savedSeasons, error: seasonsError } = await supabase
      .from("seasons")
      .upsert(
        seasons.map((s) => mapSeasonSummary(s, show.id)),
        { onConflict: "show_id,season_number" },
      )
      .select("id,season_number");
    if (seasonsError) {
      throw new Error(`Failed to cache seasons: ${seasonsError.message}`);
    }
    const seasonIdByNumber = new Map(
      (savedSeasons ?? []).map((s) => [s.season_number, s.id]),
    );

    const episodeRows = episodes.map((e) =>
      mapEpisode(e, show.id, seasonIdByNumber.get(e.season) ?? null),
    );
    if (episodeRows.length > 0) {
      const { error: episodesError } = await supabase
        .from("episodes")
        .upsert(episodeRows, {
          onConflict: "show_id,season_number,episode_number",
        });
      if (episodesError) {
        throw new Error(`Failed to cache episodes: ${episodesError.message}`);
      }
    }
  }

  return show;
}

/** Read-through cache keyed by the IMDb id (stored in `movies.source_id`). */
export async function getOrCacheMovie(imdbId: string): Promise<Tables<"movies">> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("movies")
    .select("*")
    .eq("source_id", imdbId)
    .maybeSingle();
  if (existing && !isStale(existing)) return existing;

  const details = await cinemeta.movieDetails(imdbId);
  const { data: movie, error } = await supabase
    .from("movies")
    .upsert(mapMovieDetails(details), { onConflict: "source_id" })
    .select()
    .single();
  if (error || !movie) {
    throw new Error(`Failed to cache movie ${imdbId}: ${error?.message}`);
  }
  return movie;
}
