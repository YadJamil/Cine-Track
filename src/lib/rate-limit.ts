import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * [ASSUMPTION] Simple sliding-window rate limit backed by the table itself:
 * at most `max` rows per `windowSeconds`. Good enough without extra infra.
 */
export async function rateLimitError(
  supabase: ServerClient,
  table: "comments" | "reviews",
  userId: string,
  windowSeconds = 60,
  max = 5,
): Promise<string | null> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return null; // fail open: RLS still protects writes
  if ((count ?? 0) >= max) {
    return "You're doing that too fast — try again in a minute.";
  }
  return null;
}
