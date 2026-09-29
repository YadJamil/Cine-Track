/**
 * Idempotent demo seed: caches ~16 shows from TVmaze, creates 3 demo
 * users mirroring observed states, watches, comments, likes, reviews and follows
 * — so affinity, stats and the feed are alive on first run.
 *
 * Run: npm run seed   (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * in .env.local; self-contained on purpose — no app imports. TVmaze is keyless.)
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const TVMAZE = "https://api.tvmaze.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tvmaze<T>(path: string): Promise<T> {
  const res = await fetch(`${TVMAZE}${path}`);
  if (!res.ok) throw new Error(`TVmaze ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

function stripHtml(s?: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return t || null;
}

// Shows present in the export + The Gifted (for-later fixture)
const SHOW_NAMES = [
  "Breaking Bad", "Black Mirror", "Stranger Things", "Demon Slayer",
  "Arcane", "Squid Game", "The Last of Us", "Wednesday", "The Witcher",
  "Prison Break", "Euphoria", "Yellowjackets", "Gen V", "Smiling Friends",
  "The Queen's Gambit", "The Gifted",
];

type TvmazeImage = { medium?: string; original?: string } | null;
type TvmazeEp = {
  id: number; season: number; number: number | null; name?: string;
  summary?: string; image?: TvmazeImage; airdate?: string; runtime?: number;
};
type TvmazeSe = {
  id: number; number: number; name?: string; summary?: string;
  image?: TvmazeImage; premiereDate?: string; episodeOrder?: number;
};

async function cacheShow(tvmazeId: number): Promise<number> {
  const d = await tvmaze<{
    id: number; name: string; genres?: string[]; status?: string;
    premiered?: string; averageRuntime?: number; runtime?: number;
    rating?: { average?: number }; weight?: number;
    network?: { id: number; name: string } | null;
    webChannel?: { id: number; name: string } | null;
    image?: TvmazeImage; summary?: string;
    _embedded?: { episodes?: TvmazeEp[]; seasons?: TvmazeSe[] };
  }>(`/shows/${tvmazeId}?embed[]=episodes&embed[]=seasons`);

  const seasons = d._embedded?.seasons ?? [];
  const episodes = (d._embedded?.episodes ?? []).filter((e) => e.number != null);
  const net = d.network ?? d.webChannel ?? null;

  const { data: show, error } = await db
    .from("shows")
    .upsert(
      {
        tmdb_id: d.id, name: d.name, original_name: null,
        overview: stripHtml(d.summary),
        poster_path: d.image?.medium ?? d.image?.original ?? null,
        backdrop_path: null, first_air_date: d.premiered || null,
        status: d.status ?? null,
        in_production: d.status ? d.status === "Running" : null,
        episode_runtime: d.averageRuntime ?? d.runtime ?? null,
        genres: (d.genres ?? []).map((name) => ({ name })) as never,
        networks: (net ? [{ id: net.id, name: net.name }] : []) as never,
        origin_country: [], original_language: null,
        number_of_seasons:
          seasons.filter((s) => s.number > 0).length || seasons.length || null,
        number_of_episodes: episodes.length || null,
        popularity: d.weight ?? null, vote_average: d.rating?.average ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "tmdb_id" },
    )
    .select("id")
    .single();
  if (error || !show) throw new Error(`upsert show: ${error?.message}`);

  if (seasons.length > 0) {
    const { data: seasonRows, error: sErr } = await db
      .from("seasons")
      .upsert(
        seasons.map((s) => ({
          show_id: show.id, tmdb_id: s.id, season_number: s.number,
          name: s.name || null, overview: stripHtml(s.summary),
          poster_path: s.image?.medium ?? s.image?.original ?? null,
          air_date: s.premiereDate || null, episode_count: s.episodeOrder ?? null,
        })),
        { onConflict: "show_id,season_number" },
      )
      .select("id,season_number");
    if (sErr) throw new Error(`upsert seasons: ${sErr.message}`);
    const seasonIdByNumber = new Map(
      (seasonRows ?? []).map((s) => [s.season_number, s.id]),
    );

    if (episodes.length > 0) {
      const { error: eErr } = await db.from("episodes").upsert(
        episodes.map((e) => ({
          show_id: show.id,
          season_id: seasonIdByNumber.get(e.season) ?? null,
          tmdb_id: e.id, season_number: e.season, episode_number: e.number ?? 0,
          name: e.name || null, overview: stripHtml(e.summary),
          still_path: e.image?.original ?? null, air_date: e.airdate || null,
          runtime: e.runtime ?? null,
        })),
        { onConflict: "show_id,season_number,episode_number" },
      );
      if (eErr) throw new Error(`upsert episodes: ${eErr.message}`);
    }
  }
  return show.id;
}

async function ensureUser(email: string, username: string, displayName: string) {
  const { data: page } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = page?.users.find((u) => u.email === email);
  const id =
    existing?.id ??
    (
      await db.auth.admin.createUser({
        email,
        password: "cinetrack-demo-1234",
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      })
    ).data.user?.id;
  if (!id) throw new Error(`could not create ${email}`);
  await db.from("profiles").update({ username, display_name: displayName }).eq("id", id);
  await db
    .from("user_settings")
    .update({ is_valid_age: true, onboarding_completed: true })
    .eq("user_id", id);
  return id;
}

type Ep = { id: number; season_number: number; episode_number: number; runtime: number | null; air_date: string | null };

async function airedEpisodes(showId: number): Promise<Ep[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("episodes")
    .select("id,season_number,episode_number,runtime,air_date")
    .eq("show_id", showId)
    .gt("season_number", 0)
    .lte("air_date", today)
    .order("season_number")
    .order("episode_number");
  return data ?? [];
}

async function follow(userId: string, showId: number, patch: Record<string, unknown> = {}) {
  await db.from("user_shows").upsert(
    { user_id: userId, show_id: showId, is_followed: true, followed_at: new Date().toISOString(), ...patch } as never,
    { onConflict: "user_id,show_id" },
  );
}

async function watch(
  userId: string, showId: number, eps: Ep[],
  bulk: Database["public"]["Enums"]["bulk_watch_type"],
  fallbackRuntime: number, spread: { start: Date; perDay: number },
) {
  if (eps.length === 0) return;
  const rows = eps.map((e, i) => {
    const day = Math.floor(i / spread.perDay);
    const at = new Date(spread.start.getTime() + day * 86_400_000 + (i % spread.perDay) * 30 * 60_000);
    return {
      user_id: userId, episode_id: e.id, show_id: showId,
      watched_at: at.toISOString(), bulk_type: bulk,
      runtime_seconds: (e.runtime ?? fallbackRuntime) * 60,
    };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("episode_watches")
      .upsert(rows.slice(i, i + 500), { onConflict: "user_id,episode_id", ignoreDuplicates: true });
    if (error) throw new Error(`watch: ${error.message}`);
  }
}

async function main() {
  console.log("→ caching shows from TVmaze…");
  const showIdByName = new Map<string, number>();
  for (const name of SHOW_NAMES) {
    const hit = await tvmaze<{ id: number; name: string } | null>(
      `/singlesearch/shows?q=${encodeURIComponent(name)}`,
    ).catch(() => null);
    if (!hit) {
      console.warn(`  ! no TVmaze result for ${name}`);
      continue;
    }
    const localId = await cacheShow(hit.id);
    showIdByName.set(name, localId);
    console.log(`  ✓ ${name}`);
    await sleep(400); // stay under TVmaze's ~20 req / 10s limit
  }

  const id = (name: string) => {
    const v = showIdByName.get(name);
    if (!v) throw new Error(`show missing: ${name}`);
    return v;
  };

  console.log("→ creating demo users…");
  const naza = await ensureUser("naza@cinetrack.demo", "naza", "Naza");
  const lena = await ensureUser("lena@cinetrack.demo", "lena", "Lena");
  const marco = await ensureUser("marco@cinetrack.demo", "marco", "Marco");

  console.log("→ tracking fixtures…");
  const monthsAgo = (n: number) => new Date(Date.now() - n * 30 * 86_400_000);

  // naza: power user mirroring the export
  const demonSlayer = id("Demon Slayer");
  await follow(naza, demonSlayer);
  await watch(naza, demonSlayer, await airedEpisodes(demonSlayer), "fill_previous", 25, {
    start: monthsAgo(4), perDay: 12,
  });

  const arcane = id("Arcane");
  await follow(naza, arcane);
  await watch(naza, arcane, (await airedEpisodes(arcane)).slice(0, 9), "season", 40, {
    start: monthsAgo(2), perDay: 9, // one-evening marathon → feed session + marathon badge
  });

  const squid = id("Squid Game");
  await follow(naza, squid, { is_archived: true }); // stopped at 9/9 like the export
  await watch(naza, squid, (await airedEpisodes(squid)).slice(0, 9), "unitary", 50, {
    start: monthsAgo(6), perDay: 3,
  });

  const gifted = id("The Gifted");
  await follow(naza, gifted, { is_for_later: true });
  await watch(naza, gifted, (await airedEpisodes(gifted)).slice(0, 2), "unitary", 42, {
    start: monthsAgo(8), perDay: 2,
  });

  const blackMirror = id("Black Mirror");
  await follow(naza, blackMirror, { is_followed: false }); // unfollow retains data
  await watch(naza, blackMirror, (await airedEpisodes(blackMirror)).slice(0, 6), "unitary", 60, {
    start: monthsAgo(10), perDay: 2,
  });

  for (const name of ["Stranger Things", "The Last of Us", "Breaking Bad"]) {
    await follow(naza, id(name), name === "Breaking Bad" ? { is_favorited: true } : {});
  }

  // lena & marco: overlapping follows → non-zero affinity
  for (const name of ["Stranger Things", "Breaking Bad", "Arcane", "Wednesday"]) {
    await follow(lena, id(name));
  }
  await watch(lena, arcane, (await airedEpisodes(arcane)).slice(0, 6), "unitary", 40, {
    start: monthsAgo(1), perDay: 3,
  });
  for (const name of ["Stranger Things", "The Witcher", "Prison Break", "Euphoria"]) {
    await follow(marco, id(name));
  }

  // streak for naza (8 days incl. today)
  const today = new Date();
  await db.from("user_daily_connections").upsert(
    Array.from({ length: 8 }, (_, i) => ({
      user_id: naza,
      day: new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10),
    })),
    { onConflict: "user_id,day", ignoreDuplicates: true },
  );

  console.log("→ social fixtures…");
  await db.from("follows").upsert(
    [
      { follower_id: lena, followee_id: naza },
      { follower_id: marco, followee_id: naza },
      { follower_id: naza, followee_id: lena },
    ],
    { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
  );

  const { data: firstArcaneEp } = await db
    .from("episodes")
    .select("id")
    .eq("show_id", arcane)
    .eq("season_number", 1)
    .eq("episode_number", 1)
    .single();
  if (firstArcaneEp) {
    const { data: comment } = await db
      .from("comments")
      .upsert(
        {
          user_id: naza, media_type: "show", show_id: arcane,
          episode_id: firstArcaneEp.id,
          body: "That animation style is unreal. Instant favorite.",
        } as never,
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (comment) {
      await db.from("comment_likes").upsert(
        { comment_id: comment.id, user_id: lena },
        { onConflict: "comment_id,user_id", ignoreDuplicates: true },
      );
    }
    await db.from("episode_reactions").upsert(
      { user_id: naza, episode_id: firstArcaneEp.id, reaction: "wow" },
      { onConflict: "user_id,episode_id" },
    );
  }

  await db.from("reviews").upsert(
    [
      { user_id: naza, media_type: "show", show_id: arcane, rating: 10, body: "Best animated series in years." },
      { user_id: lena, media_type: "show", show_id: id("Stranger Things"), rating: 8, body: null },
    ] as never[],
    { onConflict: "id", ignoreDuplicates: true },
  );

  console.log("→ badges, affinity, trending…");
  for (const uid of [naza, lena, marco]) {
    await db.rpc("fn_check_badges", { p_user_id: uid });
  }
  await db.rpc("fn_refresh_affinities");
  await db.rpc("fn_recompute_addiction_scores");
  await db.rpc("fn_refresh_trending");

  console.log("✓ seed complete — log in as naza@cinetrack.demo / cinetrack-demo-1234");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
