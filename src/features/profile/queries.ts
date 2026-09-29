import { createClient } from "@/lib/supabase/server";
import type { Tables, Views } from "@/lib/supabase/database.types";

export type ProfileHeader = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  gender: string | null;
  birthday: string | null;
  isPublic: boolean;
  /** false when the profile is private and the viewer is not the owner */
  visible: boolean;
};

export async function getProfileByUsername(
  username: string,
  viewerId: string | null,
): Promise<{
  header: ProfileHeader | null;
  isOwner: boolean;
  viewerFollows: boolean;
  affinity: number | null;
}> {
  const supabase = await createClient();

  // RLS hides private profiles from non-owners…
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  let header: ProfileHeader | null = null;
  if (profile) {
    header = {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      coverUrl: profile.cover_url,
      bio: profile.bio,
      gender: profile.gender,
      birthday: profile.birthday,
      isPublic: profile.is_public,
      visible: true,
    };
  } else {
    // …but usernames stay resolvable via RPC → locked header
    const { data: matches } = await supabase.rpc("fn_search_users", {
      p_query: username,
      p_limit: 5,
    });
    const exact = (matches ?? []).find((m) => m.username === username);
    if (exact) {
      header = {
        id: exact.id,
        username: exact.username,
        displayName: exact.display_name,
        avatarUrl: exact.avatar_url,
        coverUrl: null,
        bio: null,
        gender: null,
        birthday: null,
        isPublic: false,
        visible: false,
      };
    }
  }

  if (!header) {
    return { header: null, isOwner: false, viewerFollows: false, affinity: null };
  }

  const isOwner = viewerId === header.id;
  let viewerFollows = false;
  let affinity: number | null = null;
  if (viewerId && !isOwner) {
    const { data: edge } = await supabase
      .from("follows")
      .select("affinity")
      .eq("follower_id", viewerId)
      .eq("followee_id", header.id)
      .maybeSingle();
    if (edge) {
      viewerFollows = true;
      affinity = Number(edge.affinity);
    }
  }

  return { header, isOwner, viewerFollows, affinity };
}

export async function getProfileStatistics(
  userId: string,
): Promise<Views<"v_user_statistics"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_user_statistics")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getProfileShows(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_user_show_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("is_followed", true)
    .order("last_watched_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export type ProfileMovie = {
  movieId: number;
  sourceId: string;
  title: string;
  posterPath: string | null;
  genres: Tables<"movies">["genres"];
  watchedAt: string;
};

export async function getProfileMovies(userId: string): Promise<ProfileMovie[]> {
  const supabase = await createClient();
  const { data: watches } = await supabase
    .from("movie_watches")
    .select("movie_id, watched_at")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false });
  if (!watches || watches.length === 0) return [];

  const movieIds = [...new Set(watches.map((w) => w.movie_id))];
  const { data: movies } = await supabase
    .from("movies")
    .select("id, source_id, title, poster_path, genres")
    .in("id", movieIds);
  const byId = new Map((movies ?? []).map((m) => [m.id, m]));

  return watches.flatMap((w) => {
    const m = byId.get(w.movie_id);
    if (!m) return [];
    return [
      {
        movieId: m.id,
        sourceId: m.source_id,
        title: m.title,
        posterPath: m.poster_path,
        genres: m.genres,
        watchedAt: w.watched_at,
      },
    ];
  });
}

export async function getProfileBadges(userId: string): Promise<
  { badge: Tables<"badges">; unlockedAt: string }[]
> {
  const supabase = await createClient();
  const [{ data: unlocks }, { data: catalog }] = await Promise.all([
    supabase
      .from("user_badges")
      .select("badge_id, unlocked_at")
      .eq("user_id", userId),
    supabase.from("badges").select("*").order("sort"),
  ]);
  const byId = new Map((catalog ?? []).map((b) => [b.id, b]));
  return (unlocks ?? [])
    .flatMap((u) => {
      const badge = byId.get(u.badge_id);
      return badge ? [{ badge, unlockedAt: u.unlocked_at }] : [];
    })
    .sort((a, b) => a.badge.sort - b.badge.sort);
}

export async function getRecentWatches(userId: string, limit = 20) {
  const supabase = await createClient();
  const { data: watches } = await supabase
    .from("episode_watches")
    .select("episode_id, show_id, watched_at")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(limit);
  if (!watches || watches.length === 0) return [];

  const showIds = [...new Set(watches.map((w) => w.show_id))];
  const episodeIds = watches.map((w) => w.episode_id);
  const [{ data: shows }, { data: episodes }] = await Promise.all([
    supabase
      .from("shows")
      .select("id, tmdb_id, name, poster_path")
      .in("id", showIds),
    supabase
      .from("episodes")
      .select("id, season_number, episode_number, name")
      .in("id", episodeIds),
  ]);
  const showById = new Map((shows ?? []).map((s) => [s.id, s]));
  const epById = new Map((episodes ?? []).map((e) => [e.id, e]));

  return watches.flatMap((w) => {
    const show = showById.get(w.show_id);
    const ep = epById.get(w.episode_id);
    if (!show || !ep) return [];
    return [
      {
        episodeId: w.episode_id,
        watchedAt: w.watched_at,
        showTmdbId: show.tmdb_id,
        showName: show.name,
        posterPath: show.poster_path,
        seasonNumber: ep.season_number,
        episodeNumber: ep.episode_number,
        episodeName: ep.name,
      },
    ];
  });
}
