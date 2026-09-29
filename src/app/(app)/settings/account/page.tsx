import type { Metadata } from "next";
import { AccountForms } from "@/features/settings/components/account-forms";
import { createClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const providers = (user.identities ?? []).map((i) => i.provider);

  return (
    <AccountForms
      email={user.email ?? ""}
      username={profile?.username ?? ""}
      providers={providers}
    />
  );
}
