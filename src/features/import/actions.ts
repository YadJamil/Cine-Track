"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCacheShow } from "@/lib/tmdb/cache";
import { tvmaze } from "@/lib/tmdb/client";
import type { TvmazeShow } from "@/lib/tmdb/types";
import { cleanTitle, pickMatch, squash, subtitleHead } from "./match";
import { err, ok, type Result } from "@/lib/types";

const watchSchema = z.object({
  season: z.number().int(),
  episode: z.number().int(),
  watchedAt: z.string(),
  runtimeSeconds: z.number().int().nullable(),
  bulkType: z.enum(["season", "unitary"]),
});
const showSchema = z.object({
  tvdbId: z.number().int().positive().nullable(),
  name: z.string().min(1).max(300),
  isFollowed: z.boolean(),
  isFavorited: z.boolean(),
  isForLater: z.boolean(),
  isArchived: z.boolean(),
  watches: z.array(watchSchema).max(5000),
});
const batchSchema = z.object({ shows: z.array(showSchema).min(1).max(10) });

/** Search TVmaze for `query`, accepting only a title that overlaps `target`. */
async function bestMatch(
  query: string,
  target: string,
): Promise<TvmazeShow | null> {
  const results = await tvmaze.searchShows(query);
  return pickMatch(
    results.map((r) => r.show),
    target,
  );
}

/**
 * Resolve an exported show to a TVmaze show, most-trustworthy signal first:
 *   1. TheTVDB id — exact, and present on every row of a real export (31/31).
 *   2. The name minus TV Time's invented suffixes ("Euphoria (US)").
 *   3. A guarded fuzzy search on that name.
 *   4. Last resort, the name before the colon: TVmaze returns *nothing* for some
 *      long subtitles ("Demon Slayer: Kimetsu no Yaiba"). Only reachable when
 *      the full title matched nothing at all, so a show that does resolve
 *      normally ("Star Trek: Picard") can never fall through to it and collide
 *      with its parent franchise.
 */
async function resolveShow(show: {
  tvdbId: number | null;
  name: string;
}): Promise<TvmazeShow | null> {
  if (show.tvdbId) {
    const byId = await tvmaze.lookupByTvdb(show.tvdbId);
    if (byId) return byId;
  }

  const title = cleanTitle(show.name);
  const exact = await tvmaze.singleSearchShow(title);
  if (exact) return exact;

  const target = squash(title);
  if (!target) return null;
  const fuzzy = await bestMatch(title, target);
  if (fuzzy) return fuzzy;

  const head = subtitleHead(title);
  return head ? bestMatch(head, target) : null;
}

export type ImportSummary = {
  imported: { name: string; watches: number }[];
  skipped: { name: string; reason: string }[];
};

/**
 * Import one batch of TV Time shows: resolve each by name on TVmaze, cache it,
 * set follow state, and insert matched episode watches. Idempotent (existing
 * watches are ignored). Kept to small batches by the caller for rate limits.
 */
export async function importTvTimeShows(
  input: unknown,
): Promise<Result<ImportSummary>> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return err("Invalid import data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to import.");

  const summary: ImportSummary = { imported: [], skipped: [] };

  for (const show of parsed.data.shows) {
    try {
      const match = await resolveShow(show);
      if (!match) {
        summary.skipped.push({
          name: show.name,
          reason: "no match on TVmaze",
        });
        continue;
      }
      const cached = await getOrCacheShow(match.id);

      const { error: usErr } = await supabase.from("user_shows").upsert(
        {
          user_id: user.id,
          show_id: cached.id,
          is_followed: show.isFollowed,
          is_favorited: show.isFavorited,
          is_for_later: show.isForLater,
          is_archived: show.isArchived,
          followed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,show_id" },
      );
      if (usErr) {
        summary.skipped.push({ name: show.name, reason: usErr.message });
        continue;
      }

      let watchCount = 0;
      if (show.watches.length > 0) {
        const { data: episodes } = await supabase
          .from("episodes")
          .select("id, season_number, episode_number, runtime")
          .eq("show_id", cached.id);
        const epByKey = new Map(
          (episodes ?? []).map((e) => [
            `${e.season_number}-${e.episode_number}`,
            e,
          ]),
        );

        const seen = new Set<number>();
        const rows = show.watches.flatMap((w) => {
          const ep = epByKey.get(`${w.season}-${w.episode}`);
          if (!ep || seen.has(ep.id)) return [];
          seen.add(ep.id);
          return [
            {
              user_id: user.id,
              episode_id: ep.id,
              show_id: cached.id,
              watched_at: w.watchedAt,
              bulk_type: w.bulkType,
              runtime_seconds: (ep.runtime ?? 0) * 60 || w.runtimeSeconds || 0,
            },
          ];
        });

        for (let i = 0; i < rows.length; i += 500) {
          const { error: ewErr } = await supabase
            .from("episode_watches")
            .upsert(rows.slice(i, i + 500), {
              onConflict: "user_id,episode_id",
              ignoreDuplicates: true,
            });
          if (ewErr) {
            summary.skipped.push({ name: show.name, reason: ewErr.message });
            break;
          }
        }
        watchCount = rows.length;
      }
      summary.imported.push({ name: show.name, watches: watchCount });
    } catch (e) {
      summary.skipped.push({
        name: show.name,
        reason: e instanceof Error ? e.message : "error",
      });
    }
  }

  return ok(summary);
}

/** Recompute derived data once the import batches are done. */
export async function finalizeImport(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Log in to import.");

  await supabase.rpc("fn_check_badges", { p_user_id: user.id });
  await supabase.rpc("fn_refresh_affinities");
  await supabase.rpc("fn_recompute_addiction_scores");
  await supabase.rpc("fn_refresh_trending");
  revalidatePath("/", "layout");
  return ok(undefined);
}
