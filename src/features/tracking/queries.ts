import { createClient } from "@/lib/supabase/server";
import type { Functions, Views } from "@/lib/supabase/database.types";

export type WatchNextRow = Functions<"fn_watch_next">["Returns"][number];
export type ProgressRow = Views<"v_user_show_progress">;

export async function getWatchNext(userId: string): Promise<WatchNextRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_watch_next", {
    p_user_id: userId,
  });
  if (error) throw new Error(`fn_watch_next: ${error.message}`);
  return data ?? [];
}

export async function getShowProgress(userId: string): Promise<ProgressRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_user_show_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("is_followed", true)
    .order("last_watched_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`v_user_show_progress: ${error.message}`);
  return data ?? [];
}
