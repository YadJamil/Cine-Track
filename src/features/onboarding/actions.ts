"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCacheShow } from "@/lib/tmdb/cache";
import { err, ok, type Result } from "@/lib/types";
import {
  ageFromBirthday,
  ageGateSchema,
  completeOnboardingSchema,
  identitySchema,
  MIN_AGE,
  MIN_SHOWS,
} from "./schemas";

export async function submitAgeGate(input: unknown): Promise<Result> {
  const parsed = ageGateSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const age = ageFromBirthday(parsed.data.birthday);
  if (age < 0 || age > 120) return err("Enter a valid date");

  const isValidAge = age >= MIN_AGE;
  const { error: settingsError } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      is_valid_age: isValidAge,
      marketing_opt_in: parsed.data.marketingOptIn,
    });
  if (settingsError) return err(settingsError.message);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ birthday: parsed.data.birthday })
    .eq("id", user.id);
  if (profileError) return err(profileError.message);

  if (!isValidAge) return err("UNDERAGE");
  return ok(undefined);
}

export async function skipAgeGate(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    is_valid_age: true,
    marketing_opt_in: false,
  });
  if (error) return err(error.message);

  return ok(undefined);
}

export async function checkUsernameAvailable(
  username: string,
): Promise<Result<boolean>> {
  const parsed = identitySchema.shape.username.safeParse(username);
  if (!parsed.success) return ok(false);
  // Service role: private profiles are invisible to anon selects but usernames
  // must still be globally unique.
  const service = createServiceClient();
  const { count, error } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("username", parsed.data);
  if (error) return err(error.message);
  return ok((count ?? 0) === 0);
}

export async function claimIdentity(input: unknown): Promise<Result> {
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return err("That username is taken.");
    return err(error.message);
  }
  return ok(undefined);
}

export async function completeOnboarding(input: unknown): Promise<Result> {
  const parsed = completeOnboardingSchema.safeParse(input);
  if (!parsed.success) return err(`Pick at least ${MIN_SHOWS} shows to continue.`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { data: settings } = await supabase
    .from("user_settings")
    .select("is_valid_age")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!settings?.is_valid_age) return err("Complete the age step first.");

  // Cache each picked show (full: seasons + episodes) then follow it.
  const results = await Promise.allSettled(
    parsed.data.tmdbIds.map((tmdbId) => getOrCacheShow(tmdbId)),
  );
  const shows = results.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  if (shows.length < MIN_SHOWS) {
    return err("Could not load enough shows — try again.");
  }

  const now = new Date().toISOString();
  const { error: followError } = await supabase.from("user_shows").upsert(
    shows.map((s) => ({
      user_id: user.id,
      show_id: s.id,
      is_followed: true,
      followed_at: now,
    })),
    { onConflict: "user_id,show_id" },
  );
  if (followError) return err(followError.message);

  const { error: doneError } = await supabase
    .from("user_settings")
    .update({ onboarding_completed: true })
    .eq("user_id", user.id);
  if (doneError) return err(doneError.message);

  revalidatePath("/", "layout");
  return ok(undefined);
}
