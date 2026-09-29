"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { clientEnv } from "@/lib/env";
import {
  savePushSubscription,
  removePushSubscription,
  sendTestPush,
} from "@/features/notifications/push-actions";
import type { Tables } from "@/lib/supabase/database.types";
import { updateSettings } from "../actions";

// The 5 export toggles + airing reminders with offset (default 1440 = 1 day)
const TOGGLES = [
  { key: "notify_comment_likes", label: "Comment likes", hint: "Someone likes your comment" },
  { key: "notify_friend_comments", label: "Friend comments", hint: "People you follow comment" },
  { key: "notify_new_followers", label: "New followers", hint: "Someone follows you" },
  { key: "notify_badge_unlocks", label: "Badge unlocks", hint: "You earn an achievement" },
  { key: "notify_news", label: "News & articles", hint: "Product news from CineTrack" },
  { key: "notify_episode_airing", label: "Airing reminders", hint: "An episode of a followed show airs" },
] as const;

const OFFSETS = [
  { value: 60, label: "1 hour before" },
  { value: 360, label: "6 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 10080, label: "1 week before" },
];

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * navigator.serviceWorker.ready, but it rejects with "sw-timeout" instead of
 * hanging forever when no service worker ever activates (e.g. in dev, where the
 * SW is registered production-only). Without this, toggling push just spins.
 */
function serviceWorkerReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("sw-timeout")), timeoutMs),
    ),
  ]);
}

export function NotificationSettingsForm({
  settings,
}: {
  settings: Tables<"user_settings">;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined") return;
    setPushSupported(true);

    async function checkSubscription() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub && Notification.permission === "granted");
      } catch (e) {
        console.error("Error checking push subscription", e);
      }
    }
    checkSubscription();
  }, []);

  async function togglePush(checked: boolean) {
    if (!pushSupported) return;
    setPushBusy(true);
    try {
      if (checked) {
        // Ask for permission FIRST, while the tap still counts as a user
        // gesture. Awaiting the service worker before this lets the gesture
        // expire (Safari/iOS then silently drop the prompt) and hangs entirely
        // if the SW never activates — the "stuck on loading" bug.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied.");
          setPushEnabled(false);
          return;
        }
        const reg = await serviceWorkerReady();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
          ),
        });
        const json = sub.toJSON();
        const res = await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          userAgent: navigator.userAgent,
        });
        if (!res.ok) {
          toast.error(res.error);
          setPushEnabled(false);
        } else {
          setPushEnabled(true);
          toast.success("Push notifications enabled on this device! 🐾");
          await sendTestPush();
        }
      } else {
        const reg = await serviceWorkerReady();
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          const res = await removePushSubscription(sub.endpoint);
          if (!res.ok) {
            toast.error(res.error);
          } else {
            setPushEnabled(false);
            toast.success("Push notifications disabled on this device.");
          }
        } else {
          setPushEnabled(false);
        }
      }
    } catch (e) {
      console.error("Error toggling push notifications", e);
      toast.error(
        e instanceof Error && e.message === "sw-timeout"
          ? "Service worker isn't ready yet — reload the app and try again."
          : "Could not change notification settings.",
      );
      setPushEnabled(false);
    } finally {
      setPushBusy(false);
    }
  }

  function save(patch: Record<string, unknown>) {
    startTransition(async () => {
      const res = await updateSettings(patch);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Each category can be switched off independently.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>
              {t.label}
              <span className="block text-xs text-muted-foreground">
                {t.hint}
              </span>
            </span>
            <Switch
              defaultChecked={settings[t.key]}
              onCheckedChange={(v) => save({ [t.key]: v })}
            />
          </label>
        ))}

        <div className="flex items-center justify-between gap-3 text-sm">
          <span>
            Reminder timing
            <span className="block text-xs text-muted-foreground">
              How early to remind you about airing episodes
            </span>
          </span>
          <Select
            defaultValue={String(settings.airing_offset_minutes)}
            onValueChange={(v) => {
              if (v !== null) save({ airing_offset_minutes: Number(v) });
            }}
          >
            <SelectTrigger className="w-44" aria-label="Reminder timing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFSETS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pushSupported && (
          <div className="flex flex-col gap-4 border-t pt-5 mt-2">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Push notifications
                <span className="block text-xs text-muted-foreground">
                  Receive alerts on this device even when the app is closed
                </span>
              </span>
              <Switch
                checked={pushEnabled}
                disabled={pushBusy}
                onCheckedChange={togglePush}
              />
            </label>
            {pushEnabled && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pushBusy}
                  onClick={async () => {
                    setPushBusy(true);
                    try {
                      const res = await sendTestPush();
                      if (!res.ok) toast.error(res.error);
                      else toast.success("Test notification sent!");
                    } catch {
                      toast.error("Could not send test notification.");
                    } finally {
                      setPushBusy(false);
                    }
                  }}
                >
                  Send test push notification
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
