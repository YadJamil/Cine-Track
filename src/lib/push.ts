import "server-only";
import webpush from "web-push";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { createServiceClient } from "@/lib/supabase/service";

let vapidReady: boolean | null = null;

/** Configure web-push once. Returns false (and disables push) if keys are unset. */
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const publicKey = clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = serverEnv.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    vapidReady = false;
    return false;
  }
  webpush.setVapidDetails(
    serverEnv.VAPID_SUBJECT ?? "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
  vapidReady = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

/**
 * Deliver a Web Push notification to every device a user has registered. Runs
 * server-side only (needs the VAPID private key). Subscriptions the push service
 * reports as gone (404/410) are pruned so we don't keep retrying dead devices.
 * Returns how many devices were reached.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureVapid()) return 0;

  const supabase = createServiceClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          dead.push(s.endpoint);
        } else {
          console.error("Web Push delivery failed for endpoint:", s.endpoint, e);
        }
      }
    }),
  );

  if (dead.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return sent;
}
