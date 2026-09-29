import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarSettingsForm } from "@/features/settings/components/calendar-settings-form";
import { createClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calendar settings" };

export default async function CalendarSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: settings }, { data: followed }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("calendar_backward_days, excluded_show_ids")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_shows")
      .select("show_id")
      .eq("user_id", user.id)
      .eq("is_followed", true),
  ]);
  if (!settings) notFound();

  const showIds = (followed ?? []).map((f) => f.show_id);
  const { data: shows } = showIds.length
    ? await supabase
        .from("shows")
        .select("id, name, poster_path")
        .in("id", showIds)
        .order("name")
    : { data: [] };

  return (
    <CalendarSettingsForm
      backwardDays={settings.calendar_backward_days}
      excludedShowIds={settings.excluded_show_ids}
      shows={shows ?? []}
    />
  );
}
