"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { err, ok, type Result } from "@/lib/types";

const subSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});

/** Store (or refresh) the browser's push subscription for the current user. */
export async function savePushSubscription(input: unknown): Promise<Result> {
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return err("Invalid subscription");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return err(error.message);
  return ok(undefined);
}

/** Forget a device (called when the user turns notifications off). */
export async function removePushSubscription(endpoint: string): Promise<Result> {
  if (!z.string().url().safeParse(endpoint).success) return err("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) return err(error.message);
  return ok(undefined);
}

/** Fire an immediate push to the current user — proves the pipeline works. */
export async function sendTestPush(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const sent = await sendPushToUser(user.id, {
    title: "CineTrack 🐾",
    body: "Notifications are on — we'll ping you when new episodes drop.",
    url: "/notifications",
    tag: "cinetrack-welcome",
  });
  return sent > 0 ? ok(undefined) : err("No active devices to notify yet.");
}
