"use server";

import JSZip from "jszip";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { err, ok, type Result } from "@/lib/types";

/**
 * gdpr_requests parity: user-triggered export, generated server-side,
 * zipped JSON per table, stored in the private `exports` bucket.
 * Small datasets → generated inline; status transitions still recorded.
 */
export async function requestDataExport(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  // one in-flight request at a time
  const { data: inflight } = await supabase
    .from("data_export_requests")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])
    .maybeSingle();
  if (inflight) return err("An export is already being prepared.");

  const { data: request, error: insertError } = await supabase
    .from("data_export_requests")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (insertError || !request) {
    return err(insertError?.message ?? "Could not create request");
  }

  const service = createServiceClient();
  await service
    .from("data_export_requests")
    .update({ status: "processing" })
    .eq("id", request.id);

  try {
    const tables = [
      "profiles",
      "user_settings",
      "user_shows",
      "episode_watches",
      "movie_watches",
      "comments",
      "reviews",
      "episode_reactions",
      "user_badges",
      "user_daily_connections",
      "notifications",
    ] as const;

    const zip = new JSZip();
    for (const table of tables) {
      const keyColumn = table === "profiles" ? "id" : "user_id";
      // postgrest-js can't type a column filter across a union of tables
      const { data } = await service
        .from(table)
        .select("*")
        .eq(keyColumn as never, user.id);
      zip.file(`${table}.json`, JSON.stringify(data ?? [], null, 2));
    }
    const [{ data: following }, { data: followers }] = await Promise.all([
      service.from("follows").select("*").eq("follower_id", user.id),
      service.from("follows").select("*").eq("followee_id", user.id),
    ]);
    zip.file("following.json", JSON.stringify(following ?? [], null, 2));
    zip.file("followers.json", JSON.stringify(followers ?? [], null, 2));

    const bytes = await zip.generateAsync({ type: "uint8array" });
    const path = `${user.id}/episode-export-${Date.now()}.zip`;
    const { error: uploadError } = await service.storage
      .from("exports")
      .upload(path, bytes, { contentType: "application/zip" });
    if (uploadError) throw new Error(uploadError.message);

    await service
      .from("data_export_requests")
      .update({ status: "done", storage_path: path })
      .eq("id", request.id);
  } catch (e) {
    await service
      .from("data_export_requests")
      .update({
        status: "error",
        error_message: e instanceof Error ? e.message : "Unknown error",
      })
      .eq("id", request.id);
    return err("Export failed — try again.");
  }

  revalidatePath("/settings/data");
  return ok(undefined);
}

export async function getExportDownloadUrl(
  requestId: string,
): Promise<Result<string>> {
  if (!z.string().uuid().safeParse(requestId).success) return err("Invalid id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not authenticated");

  const { data: request } = await supabase
    .from("data_export_requests")
    .select("storage_path, status, user_id")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!request || request.status !== "done" || !request.storage_path) {
    return err("Export not ready");
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("exports")
    .createSignedUrl(request.storage_path, 300);
  if (error || !data) return err(error?.message ?? "Could not sign URL");
  return ok(data.signedUrl);
}
