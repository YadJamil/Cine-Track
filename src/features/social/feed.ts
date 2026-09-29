"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Functions } from "@/lib/supabase/database.types";
import { err, ok, type Result } from "@/lib/types";

export type FeedEvent = Functions<"fn_activity_feed">["Returns"][number];

const pageSchema = z.object({
  before: z.string().datetime({ offset: true }).nullable(),
});

export async function fetchFeedPage(
  input: unknown,
): Promise<Result<FeedEvent[]>> {
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return err("Invalid cursor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { data, error } = await supabase.rpc("fn_activity_feed", {
    p_user_id: user.id,
    p_limit: 30,
    p_before: parsed.data.before,
  });
  if (error) return err(error.message);
  return ok(data ?? []);
}
