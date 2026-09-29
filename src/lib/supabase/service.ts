import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS — used exclusively for TMDB cache writes,
 * notification/export jobs, and seeding. Never import from client components.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
