import { createClient } from "@/lib/supabase/server";
import { getOrCacheShow } from "@/lib/tmdb/cache";
import type { Bucket, Tables } from "@/lib/supabase/database.types";

export type EpisodeItem = {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  watched: boolean;
  /** aired-but-unwatched episodes strictly before this one (fill-previous prompt) */
  earlierUnwatched: number;
};

export type SeasonItem = {
  id: number;
  seasonNumber: number;
  name: string | null;
  posterPath: string | null;
  airDate: string | null;
  episodeCount: number;
  watchedCount: number;
  airedCount: number;
};


export type ShowPageData = {
  show: Tables<"shows">;
  seasons: SeasonItem[];
  episodesBySeason: Map<number, EpisodeItem[]>;
  userShow: Pick<
    Tables<"user_shows">,
    "is_followed" | "is_favorited" | "is_for_later" | "is_archived"
  > | null;
  /** Tracking bucket for the viewer; null when signed out or not followed. */
  bucket: Bucket | null;
  watchedCount: number;
  airedCount: number;
};

export type SimilarShow = {
  tmdbId: number;
  name: string;
  posterPath: string | null;
  year: string | null;
};

/**
 * No provider recommendations API — surface locally-cached shows that share the
 * primary genre, most popular first (excluding the show itself).
 */
export async function getSimilarShows(
  showId: number,
  genres: { name: string }[],
): Promise<SimilarShow[]> {
  const primary = genres[0]?.name;
  if (!primary) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("shows")
    .select("tmdb_id, name, poster_path, first_air_date")
    // jsonb containment — must be a JSON string, else postgrest sends a PG array.
    .contains("genres", JSON.stringify([{ name: primary }]))
    .neq("id", showId)
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(12);
  return (data ?? []).map((s) => ({
    tmdbId: s.tmdb_id,
    name: s.name,
    posterPath: s.poster_path,
    year: s.first_air_date?.slice(0, 4) ?? null,
  }));
}

export async function getShowPageData(
  tmdbId: number,
  viewerId: string | null,
): Promise<ShowPageData> {
  const show = await getOrCacheShow(tmdbId);
  const supabase = await createClient();

  const [seasonsRes, episodesRes, userShowRes, watchesRes, bucketRes] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, season_number, name, poster_path, air_date, episode_count")
        .eq("show_id", show.id)
        .order("season_number"),
      supabase
        .from("episodes")
        .select(
          "id, season_number, episode_number, name, air_date, runtime, still_path",
        )
        .eq("show_id", show.id)
        .order("season_number")
        .order("episode_number"),
      viewerId
        ? supabase
            .from("user_shows")
            .select("is_followed, is_favorited, is_for_later, is_archived")
            .eq("user_id", viewerId)
            .eq("show_id", show.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      viewerId
        ? supabase
            .from("episode_watches")
            .select("episode_id")
            .eq("user_id", viewerId)
            .eq("show_id", show.id)
        : Promise.resolve({ data: [] as { episode_id: number }[] }),
      // Read the bucket rather than recomputing it — the view is the only place
      // completed/up_to_date is derived.
      viewerId
        ? supabase
            .from("v_user_show_progress")
            .select("bucket")
            .eq("user_id", viewerId)
            .eq("show_id", show.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const watchedIds = new Set(
    (watchesRes.data ?? []).map((w) => w.episode_id),
  );
  const today = new Date().toISOString().slice(0, 10);

  const episodesBySeason = new Map<number, EpisodeItem[]>();
  let earlierUnwatchedRunning = 0; // over regular seasons in airing order
  let watchedCount = 0;
  let airedCount = 0;

  for (const e of episodesRes.data ?? []) {
    const aired = e.air_date !== null && e.air_date <= today;
    const watched = watchedIds.has(e.id);
    const isRegular = e.season_number > 0;
    if (isRegular && aired) airedCount += 1;
    if (watched) watchedCount += 1;

    const item: EpisodeItem = {
      id: e.id,
      seasonNumber: e.season_number,
      episodeNumber: e.episode_number,
      name: e.name,
      airDate: e.air_date,
      runtime: e.runtime,
      stillPath: e.still_path,
      watched,
      earlierUnwatched: isRegular ? earlierUnwatchedRunning : 0,
    };
    const bucket = episodesBySeason.get(e.season_number) ?? [];
    bucket.push(item);
    episodesBySeason.set(e.season_number, bucket);

    if (isRegular && aired && !watched) earlierUnwatchedRunning += 1;
  }

  const seasons: SeasonItem[] = (seasonsRes.data ?? []).map((s) => {
    const eps = episodesBySeason.get(s.season_number) ?? [];
    return {
      id: s.id,
      seasonNumber: s.season_number,
      name: s.name,
      posterPath: s.poster_path,
      airDate: s.air_date,
      episodeCount: s.episode_count ?? eps.length,
      watchedCount: eps.filter((e) => e.watched).length,
      airedCount: eps.filter((e) => e.airDate !== null && e.airDate <= today)
        .length,
    };
  });

  return {
    show,
    seasons,
    episodesBySeason,
    userShow: userShowRes.data ?? null,
    bucket: bucketRes.data?.bucket ?? null,
    watchedCount,
    airedCount,
  };
}
