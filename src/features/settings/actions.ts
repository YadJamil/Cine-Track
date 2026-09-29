"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { err, ok, type Result } from "@/lib/types";

const settingsSchema = z
  .object({
    notify_comment_likes: z.boolean(),
    notify_friend_comments: z.boolean(),
    notify_new_followers: z.boolean(),
    notify_badge_unlocks: z.boolean(),
    notify_news: z.boolean(),
    notify_episode_airing: z.boolean(),
    airing_offset_minutes: z.union([
      z.literal(60),
      z.literal(360),
      z.literal(1440),
      z.literal(10080),
    ]),
    calendar_backward_days: z.number().int().min(0).max(30),
    excluded_show_ids: z.array(z.number().int().positive()).max(500),
    marketing_opt_in: z.boolean(),
    theme: z.enum(["light", "dark", "system"]),
    timezone: z.string().max(60),
    locale: z.string().max(10),
  })
  .partial();

export async function updateSettings(input: unknown): Promise<Result> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return err("Invalid settings");
  if (Object.keys(parsed.data).length === 0) return ok(undefined);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .update(parsed.data)
    .eq("user_id", user.id);
  if (error) return err(error.message);

  revalidatePath("/settings", "layout");
  revalidatePath("/calendar");
  return ok(undefined);
}

const privacySchema = z.object({ isPublic: z.boolean() });

export async function updatePrivacy(input: unknown): Promise<Result> {
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ is_public: parsed.data.isPublic })
    .eq("id", user.id);
  if (error) return err(error.message);

  revalidatePath("/settings", "layout");
  return ok(undefined);
}

const usernameSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/, "3–20 chars: a–z, 0–9, _"),
});

export async function changeUsername(input: unknown): Promise<Result> {
  const parsed = usernameSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid username");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return err("That username is taken.");
    return err(error.message);
  }

  revalidatePath("/", "layout");
  return ok(undefined);
}

const emailSchema = z.object({ email: z.string().email() });

export async function changeEmail(input: unknown): Promise<Result> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return err("Enter a valid email");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
  });
  if (error) return err(error.message);
  return ok(undefined); // Supabase sends double confirmation emails
}

const passwordSchema = z.object({ password: z.string().min(8).max(72) });

export async function changePassword(input: unknown): Promise<Result> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return err("Password must be at least 8 characters");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return err(error.message);
  return ok(undefined);
}

const deleteSchema = z.object({ confirmation: z.literal("DELETE") });

/** Full cascade: auth.users delete removes every owned row via FKs. */
export async function deleteAccount(input: unknown): Promise<Result> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return err("Type DELETE to confirm.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return err(error.message);

  await supabase.auth.signOut();
  // Middleware caches onboarding status in a cookie; clear it so a reused
  // browser can't skip onboarding for whichever account signs in next.
  (await cookies()).delete("ob_ok");
  return ok(undefined);
}
