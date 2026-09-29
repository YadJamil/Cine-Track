import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { sendPushToUser } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/service";

// web-push needs the Node runtime (not edge).
export const runtime = "nodejs";

/**
 * Called by the DB trigger (`fn_dispatch_push`, via pg_net) right after a
 * notification row is inserted. Loads that notification and fans it out as Web
 * Push to the recipient's devices — this is what delivers alerts while the app
 * is closed. Authenticated by a shared secret so only the DB can invoke it.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.PUSH_DISPATCH_SECRET;
  if (secret && req.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { notification_id } = (await req.json().catch(() => ({}))) as {
    notification_id?: string;
  };
  if (!notification_id) {
    return NextResponse.json({ error: "missing notification_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: n } = await supabase
    .from("notifications")
    .select("user_id, title, body, url, type, actors")
    .eq("id", notification_id)
    .maybeSingle();
  if (!n) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let title = n.title ?? "CineTrack";
  let body = n.body ?? undefined;

  const actorsList = Array.isArray(n.actors) ? n.actors : [];
  const actorName = (actorsList[0] as { name?: string | null })?.name;

  if (actorName) {
    if (n.type === "new_follower") {
      title = "New Follower";
      body = `${actorName} started following you`;
    } else if (n.type === "comment_like") {
      title = "New Like";
      body = `${actorName} liked your comment`;
    } else if (n.type === "friend_comment") {
      title = `${actorName} commented`;
      body = n.body ?? undefined;
    }
  }

  const sent = await sendPushToUser(n.user_id, {
    title,
    body,
    url: n.url ?? "/notifications",
    tag: notification_id,
  });
  return NextResponse.json({ sent });
}
