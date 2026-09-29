"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { err, ok, type Result } from "@/lib/types";
import type { MediaRowItem } from "@/components/shared/media-row";
import { getGenreBrowse, getUserGenreAffinity } from "./queries";

const pageSchema = z.object({
  genre: z.string().min(1),
  offset: z.number().int().nonnegative(),
});

export async function loadMoreGenreItems(
  input: unknown,
): Promise<Result<MediaRowItem[]>> {
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return err("Invalid page request");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const affinity = user ? await getUserGenreAffinity(user.id) : null;

  const items = await getGenreBrowse(parsed.data.genre, {
    limit: 24,
    offset: parsed.data.offset,
    blockedShows: affinity?.blockedShows,
    blockedMovies: affinity?.blockedMovies,
    userId: user?.id,
  });
  return ok(items);
}
