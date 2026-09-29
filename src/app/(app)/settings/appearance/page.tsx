import type { Metadata } from "next";
import { AppearanceForm } from "@/features/settings/components/appearance-form";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearanceSettingsPage() {
  await requireUser();
  return <AppearanceForm />;
}
