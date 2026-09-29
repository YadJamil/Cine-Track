import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrivacyForm } from "@/features/settings/components/privacy-form";
import { createClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacySettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("is_public").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_settings")
      .select("marketing_opt_in")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!profile || !settings) notFound();

  return (
    <PrivacyForm
      isPublic={profile.is_public}
      marketingOptIn={settings.marketing_opt_in}
    />
  );
}
