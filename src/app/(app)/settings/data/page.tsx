import type { Metadata } from "next";
import { DataRequests } from "@/features/settings/components/data-requests";
import { TvTimeImport } from "@/features/import/components/tv-time-import";
import { createClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your data" };

export default async function DataSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("data_export_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <TvTimeImport />
      <DataRequests requests={requests ?? []} />
    </div>
  );
}
