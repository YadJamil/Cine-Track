import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationSettingsForm } from "@/features/settings/components/notification-settings-form";
import { createClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!settings) notFound();

  return <NotificationSettingsForm settings={settings} />;
}
