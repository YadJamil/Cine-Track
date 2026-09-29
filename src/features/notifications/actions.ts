"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { err, ok, type Result } from "@/lib/types";

export async function markNotificationRead(
  notificationId: string,
): Promise<Result> {
  if (!z.string().uuid().safeParse(notificationId).success) {
    return err("Invalid input");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  if (error) return err(error.message);

  revalidatePath("/notifications");
  return ok(undefined);
}

export async function markAllNotificationsRead(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return err(error.message);

  revalidatePath("/notifications");
  return ok(undefined);
}
